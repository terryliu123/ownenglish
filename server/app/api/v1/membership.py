from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.api.v1.auth import get_current_user
from app.db.session import get_db
from app.models import MembershipPlan, PaymentOrder, TeacherMembership, TeacherProfile, UserRole
from app.models import User as UserModel
from app.services.membership import (
    FREE_PLAN_CODE,
    PAID_MONTHLY_PLAN_CODE,
    PAID_YEARLY_PLAN_CODE,
    ensure_membership_plans,
    extend_membership,
    get_effective_membership,
    serialize_teacher_membership_snapshot,
)
from app.services.wechat_pay import (
    WeChatPayConfigError,
    WeChatPayError,
    build_payment_description,
    create_h5_payment,
    create_native_payment,
    decrypt_callback_resource,
    is_wechat_pay_configured,
    map_wechat_trade_state,
    parse_paid_at,
    query_order_status,
    verify_callback_signature,
)

router = APIRouter(prefix="/membership", tags=["Membership"])


class CreatePaymentOrderRequest(BaseModel):
    plan_code: str = Field(..., pattern="^(paid_monthly|paid_yearly)$")


def _serialize_plan(plan: MembershipPlan) -> dict[str, Any]:
    return {
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "price_cents": plan.price_cents,
        "duration_days": plan.duration_days,
        "max_classes": plan.max_classes,
        "max_students_per_class": plan.max_students_per_class,
        "max_task_groups": plan.max_task_groups,
        "max_study_packs": plan.max_study_packs,
        "can_use_ai": plan.can_use_ai,
        "is_active": plan.is_active,
        "sort_order": plan.sort_order,
    }


def _serialize_order(order: PaymentOrder) -> dict[str, Any]:
    return {
        "id": order.id,
        "order_no": order.order_no,
        "plan_code": order.plan_code,
        "amount": order.amount,
        "status": order.status,
        "payment_channel": order.payment_channel,
        "wechat_prepay_id": order.wechat_prepay_id,
        "wechat_h5_url": order.wechat_h5_url,
        "paid_at": order.paid_at,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }


async def _get_teacher(current_user: UserModel, db: AsyncSession) -> TeacherProfile:
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers can access membership")
    result = await db.execute(select(TeacherProfile).where(TeacherProfile.user_id == current_user.id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher profile not found")
    return teacher


async def _sync_order_from_wechat(db: AsyncSession, order: PaymentOrder) -> PaymentOrder:
    if order.status == "paid" or not is_wechat_pay_configured():
        return order
    try:
        transaction = query_order_status(order.order_no)
    except WeChatPayError:
        return order

    trade_state = transaction.get("trade_state")
    mapped_status = map_wechat_trade_state(trade_state)
    order.status = mapped_status
    order.raw_notify_payload = transaction
    order.paid_at = parse_paid_at(transaction.get("success_time"))
    if transaction.get("transaction_id"):
        order.wechat_prepay_id = str(transaction.get("transaction_id"))

    if mapped_status == "paid":
        result = await db.execute(select(TeacherMembership).where(TeacherMembership.teacher_id == order.teacher_id))
        membership = result.scalar_one()
        result = await db.execute(select(MembershipPlan).where(MembershipPlan.code == order.plan_code))
        plan = result.scalar_one()
        extend_membership(membership, order.plan_code, int(plan.duration_days or 0))

    await db.flush()
    return order


@router.get("/me")
async def get_my_membership(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await _get_teacher(current_user, db)
    snapshot = await serialize_teacher_membership_snapshot(db, teacher.user_id)
    return {
        **snapshot,
        "wechat_pay_configured": is_wechat_pay_configured(),
    }


@router.get("/plans")
async def get_membership_plans(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_teacher(current_user, db)
    await ensure_membership_plans(db)
    plans = (
        await db.execute(
            select(MembershipPlan).where(MembershipPlan.is_active == True).order_by(MembershipPlan.sort_order.asc())
        )
    ).scalars().all()
    return {"items": [_serialize_plan(plan) for plan in plans]}


@router.get("/orders")
async def list_payment_orders(
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await _get_teacher(current_user, db)
    orders = (
        await db.execute(
            select(PaymentOrder)
            .where(PaymentOrder.teacher_id == teacher.user_id)
            .order_by(desc(PaymentOrder.created_at))
            .limit(20)
        )
    ).scalars().all()
    return {"items": [_serialize_order(order) for order in orders]}


@router.get("/orders/{order_no}")
async def get_payment_order(
    order_no: str,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await _get_teacher(current_user, db)
    result = await db.execute(
        select(PaymentOrder).where(
            PaymentOrder.order_no == order_no,
            PaymentOrder.teacher_id == teacher.user_id,
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order not found")
    order = await _sync_order_from_wechat(db, order)
    return _serialize_order(order)


@router.post("/orders")
async def create_payment_order(
    data: CreatePaymentOrderRequest,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    teacher = await _get_teacher(current_user, db)
    if not is_wechat_pay_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="WeChat Pay is not configured")

    result = await db.execute(
        select(MembershipPlan).where(
            MembershipPlan.code == data.plan_code,
            MembershipPlan.is_active == True,
        )
    )
    plan = result.scalar_one_or_none()
    if not plan or plan.code == FREE_PLAN_CODE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported membership plan")

    existing_pending = (
        await db.execute(
            select(PaymentOrder)
            .where(
                PaymentOrder.teacher_id == teacher.user_id,
                PaymentOrder.plan_code == plan.code,
                PaymentOrder.status == "pending",
            )
            .order_by(desc(PaymentOrder.created_at))
            .limit(1)
        )
    ).scalar_one_or_none()
    if existing_pending:
        return {
            **_serialize_order(existing_pending),
            "payment": {
                "code_url": existing_pending.wechat_h5_url,
                "h5_url": existing_pending.wechat_h5_url,
            },
        }

    order_no = f"MEM{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}{secrets.randbelow(999999):06d}"
    client_ip = request.client.host if request.client else "127.0.0.1"

    try:
        payment_payload = create_native_payment(
            order_no=order_no,
            description=build_payment_description(plan.name),
            amount_cents=plan.price_cents,
        )
    except (WeChatPayConfigError, WeChatPayError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    order = PaymentOrder(
        order_no=order_no,
        teacher_id=teacher.user_id,
        plan_code=plan.code,
        amount=plan.price_cents,
        status="pending",
        wechat_prepay_id=payment_payload.get("prepay_id"),
        wechat_h5_url=payment_payload.get("code_url"),
        raw_notify_payload=payment_payload,
    )
    db.add(order)
    await db.flush()

    return {
        **_serialize_order(order),
        "payment": {
            "code_url": payment_payload.get("code_url"),
        },
    }


@router.post("/wechat/notify")
async def handle_wechat_notify(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = (await request.body()).decode("utf-8")
    headers = request.headers

    timestamp = headers.get("Wechatpay-Timestamp", "")
    nonce = headers.get("Wechatpay-Nonce", "")
    signature = headers.get("Wechatpay-Signature", "")

    try:
        if not verify_callback_signature(timestamp=timestamp, nonce=nonce, body=body, signature=signature):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid WeChat Pay signature")

        payload = json.loads(body)
        resource = payload.get("resource") or {}
        decrypted = decrypt_callback_resource(resource)
        order_no = decrypted.get("out_trade_no")
        if not order_no:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing out_trade_no")

        result = await db.execute(select(PaymentOrder).where(PaymentOrder.order_no == order_no))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment order not found")

        order.status = map_wechat_trade_state(decrypted.get("trade_state"))
        order.raw_notify_payload = payload
        order.paid_at = parse_paid_at(decrypted.get("success_time"))
        if decrypted.get("transaction_id"):
            order.wechat_prepay_id = str(decrypted.get("transaction_id"))

        if order.status == "paid":
            result = await db.execute(select(TeacherMembership).where(TeacherMembership.teacher_id == order.teacher_id))
            membership = result.scalar_one()
            result = await db.execute(select(MembershipPlan).where(MembershipPlan.code == order.plan_code))
            plan = result.scalar_one()
            extend_membership(membership, order.plan_code, int(plan.duration_days or 0))

        await db.flush()
        return {"code": "SUCCESS", "message": "成功"}
    except HTTPException:
        raise
    except (WeChatPayError, ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
