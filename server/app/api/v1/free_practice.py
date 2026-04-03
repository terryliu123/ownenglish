"""Free practice content endpoints - platform-wide exercises without class enrollment."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.models import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/free-practice", tags=["Free Practice"])

# Platform-wide practice content (A1-A2 level)
# In production, these would be stored in a database

PRACTICE_CATEGORIES = [
    {
        "id": "greetings",
        "name": "日常问候",
        "name_en": "Daily Greetings",
        "level": "A1",
        "icon": "👋",
        "description": "学习如何用英语打招呼和介绍自己",
        "exercises": [
            {
                "id": "greetings_1",
                "type": "vocabulary",
                "question": "Hello",
                "options": ["你好", "再见", "谢谢", "对不起"],
                "correct": 0,
            },
            {
                "id": "greetings_2",
                "type": "vocabulary",
                "question": "Good morning",
                "options": ["早上好", "下午好", "晚上好", "晚安"],
                "correct": 0,
            },
            {
                "id": "greetings_3",
                "type": "sentence",
                "question": "How are you?",
                "answer": "I'm fine, thank you.",
                "translation": "我很好，谢谢。",
            },
        ],
    },
    {
        "id": "introductions",
        "name": "自我介绍",
        "name_en": "Self Introduction",
        "level": "A1",
        "icon": "🧑",
        "description": "学习如何用英语介绍自己的名字、年龄和国籍",
        "exercises": [
            {
                "id": "intro_1",
                "type": "sentence",
                "question": "What's your name?",
                "answer": "My name is...",
                "translation": "你叫什么名字？",
            },
            {
                "id": "intro_2",
                "type": "sentence",
                "question": "Where are you from?",
                "answer": "I'm from...",
                "translation": "你来自哪里？",
            },
        ],
    },
    {
        "id": "numbers",
        "name": "数字与时间",
        "name_en": "Numbers & Time",
        "level": "A1",
        "icon": "🔢",
        "description": "学习英语数字、时间和日期的表达",
        "exercises": [
            {
                "id": "num_1",
                "type": "vocabulary",
                "question": "one",
                "options": ["一", "二", "三", "四"],
                "correct": 0,
            },
            {
                "id": "num_2",
                "type": "vocabulary",
                "question": "five",
                "options": ["四", "五", "六", "七"],
                "correct": 1,
            },
        ],
    },
    {
        "id": "polite",
        "name": "礼貌用语",
        "name_en": "Polite Expressions",
        "level": "A2",
        "icon": "🙏",
        "description": "学习用英语表达请求、道歉和感谢",
        "exercises": [
            {
                "id": "polite_1",
                "type": "sentence",
                "question": "如何礼貌地请求帮助？",
                "answer": "Could you please help me?",
                "translation": "你能帮我一下吗？",
            },
            {
                "id": "polite_2",
                "type": "sentence",
                "question": "如何道歉？",
                "answer": "I'm sorry for...",
                "translation": "对不起，我...",
            },
            {
                "id": "polite_3",
                "type": "vocabulary",
                "question": "Please",
                "options": ["请", "谢谢", "对不起", "没关系"],
                "correct": 0,
            },
        ],
    },
    {
        "id": "directions",
        "name": "问路指路",
        "name_en": "Directions",
        "level": "A2",
        "icon": "🗺️",
        "description": "学习如何问路和指路",
        "exercises": [
            {
                "id": "dir_1",
                "type": "sentence",
                "question": "请问...在哪里？",
                "answer": "Excuse me, where is...?",
                "translation": "打扰一下，...在哪里？",
            },
            {
                "id": "dir_2",
                "type": "vocabulary",
                "question": "left",
                "options": ["左", "右", "直走", "拐弯"],
                "correct": 0,
            },
        ],
    },
    {
        "id": "shopping",
        "name": "购物用语",
        "name_en": "Shopping",
        "level": "A2",
        "icon": "🛒",
        "description": "学习在商店购物的常用英语",
        "exercises": [
            {
                "id": "shop_1",
                "type": "sentence",
                "question": "这个多少钱？",
                "answer": "How much is this?",
                "translation": "这个多少钱？",
            },
            {
                "id": "shop_2",
                "type": "vocabulary",
                "question": "expensive",
                "options": ["贵的", "便宜的", "新的", "旧的"],
                "correct": 0,
            },
        ],
    },
]


@router.get("/categories")
async def get_categories():
    """Get all available practice categories."""
    return [
        {
            "id": cat["id"],
            "name": cat["name"],
            "name_en": cat["name_en"],
            "level": cat["level"],
            "icon": cat["icon"],
            "description": cat["description"],
            "exercise_count": len(cat["exercises"]),
        }
        for cat in PRACTICE_CATEGORIES
    ]


@router.get("/categories/{category_id}")
async def get_category(category_id: str):
    """Get a specific practice category with exercises."""
    for cat in PRACTICE_CATEGORIES:
        if cat["id"] == category_id:
            return cat
    return {"error": "Category not found"}


@router.get("/categories/{category_id}/exercise/{exercise_id}")
async def get_exercise(category_id: str, exercise_id: str):
    """Get a specific exercise."""
    for cat in PRACTICE_CATEGORIES:
        if cat["id"] == category_id:
            for ex in cat["exercises"]:
                if ex["id"] == exercise_id:
                    return {
                        "category": cat["name"],
                        "exercise": ex,
                    }
    return {"error": "Exercise not found"}


@router.post("/submit")
async def submit_answer(
    category_id: str,
    exercise_id: str,
    answer: str,
    current_user: User = Depends(get_current_user),
):
    """Submit an answer for an exercise and get feedback."""
    for cat in PRACTICE_CATEGORIES:
        if cat["id"] == category_id:
            for ex in cat["exercises"]:
                if ex["id"] == exercise_id:
                    is_correct = False
                    correct_answer = None

                    if ex["type"] == "vocabulary":
                        correct_idx = ex.get("correct", 0)
                        correct_answer = ex["options"][correct_idx]
                        # For vocabulary, check if answer is the option index
                        is_correct = str(answer) == str(correct_idx)
                    elif ex["type"] == "sentence":
                        correct_answer = ex.get("answer", "")
                        # Simple check - in production use fuzzy matching
                        is_correct = answer.lower().strip() == correct_answer.lower().strip()

                    return {
                        "is_correct": is_correct,
                        "correct_answer": correct_answer,
                        "translation": ex.get("translation", ""),
                    }

    return {"error": "Exercise not found"}
