# 微信支付联调清单

## 1. 需要准备的参数

必填：

- `WECHAT_PAY_APP_ID`
- `WECHAT_PAY_MCH_ID`
- `WECHAT_PAY_MCH_SERIAL_NO`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_NOTIFY_URL`
- `WECHAT_PAY_RETURN_URL`
- `WECHAT_PAY_H5_DOMAIN`

证书二选一：

- 文件路径方式
  - `WECHAT_PAY_PRIVATE_KEY_PATH`
  - `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH`
- 原文方式
  - `WECHAT_PAY_PRIVATE_KEY`
  - `WECHAT_PAY_PLATFORM_PUBLIC_KEY`

会员价格：

- `MEMBERSHIP_MONTHLY_PRICE_CENTS=3900`
- `MEMBERSHIP_YEARLY_PRICE_CENTS=39900`

## 2. 微信侧前置检查

- 商户平台已开通 H5 支付
- `WECHAT_PAY_NOTIFY_URL` 对应域名公网可访问
- `WECHAT_PAY_H5_DOMAIN` 已在微信支付侧配置
- 商户证书序列号与商户私钥一致
- API v3 密钥与商户平台配置一致

## 3. 本地配置位置

后端配置文件：

- `D:/pcode/ownenglish/server/.env`
- 样板：`D:/pcode/ownenglish/server/.env.example`

更新配置后需要重启后端：

```powershell
cd D:\pcode\ownenglish\server
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 4. 当前系统已接好的链路

后端：

- 套餐与订单模型
- 老师会员快照接口
- 微信 H5 下单接口
- 微信支付回调接口
- 订单查询接口
- 支付成功后会员顺延升级

前端：

- 老师会员中心
- 月付 / 年付下单入口
- 免费与付费权益展示
- 班级 / 课前准备 / 学习包 / AI 权限拦截

## 5. 联调顺序

### A. 配置验证

1. 填写 `.env`
2. 重启后端
3. 登录老师账号
4. 打开会员中心，确认：
   - 当前套餐可见
   - 月付金额显示 `¥39.00`
   - 年付金额显示 `¥399.00`

### B. 下单验证

1. 点击月付或年付
2. 后端应创建订单
3. 前端应跳转到微信 H5 支付链接

### C. 回调验证

1. 支付完成后，微信调用 `WECHAT_PAY_NOTIFY_URL`
2. 后端验签、解密、更新订单
3. 老师会员状态变更为付费会员或顺延到期时间

### D. 权益验证

支付成功后验证：

- 免费会员受限功能恢复可用
- AI 创建 / AI 导入按钮可点击
- 班级配额从 `2 / 20` 切换到 `10 / 60`
- 右上角会员徽标切换为付费状态

## 6. 异常检查项

- 商户参数缺失：会员中心应提示未配置微信支付
- 下单失败：前端弹出错误提示
- 回调验签失败：订单不升级
- 重复回调：不重复延长会员时间
- 已有付费会员再次购买：按顺延处理，不覆盖当前周期

## 7. 代码入口

后端：

- `D:/pcode/ownenglish/server/app/services/wechat_pay.py`
- `D:/pcode/ownenglish/server/app/services/membership.py`
- `D:/pcode/ownenglish/server/app/api/v1/membership.py`
- `D:/pcode/ownenglish/server/app/core/config.py`

前端：

- `D:/pcode/ownenglish/client/src/pages/teacher/Membership.tsx`
- `D:/pcode/ownenglish/client/src/services/api.ts`
- `D:/pcode/ownenglish/client/src/components/layout/Layout.tsx`
