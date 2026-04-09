# 敏感词检测服务
# 本地违禁词库 + 第三方API（阿里云/腾讯云文本审核）

import re
from app.core.config import get_settings

# 本地违禁词库（与客户端保持一致）
LOCAL_BLOCKED_WORDS = [
    # 政治相关
    '台独', '藏独', '疆独', '分裂', '颠覆', '反华', '敌对',
    # 色情低俗
    '色情', '黄色', '裸', '成人', '一夜情', '约炮', '援交',
    '色情', '性感', '裸露', '色情网站', '成人电影',
    # 赌博诈骗
    '赌博', '赌场', '博彩', '时时彩', '赛车', 'pk10',
    '网络赌博', '澳门赌场', '诈赌', '出千',
    # 毒品相关
    '毒品', '大麻', '冰毒', '海洛因', 'K粉', '摇头丸',
    '吸毒', '贩毒', '制毒',
    # 暴力恐怖
    '恐怖', '爆炸', '袭击', '枪支', '刀具', '砍人',
    '自杀', '自残', '杀人', '暴力',
    # 虚假广告
    '诈骗', '骗子', '假冒', '虚假', '木马', '病毒',
    '钓鱼网站', '盗号',
    # 其他违规
    '代考', '替考', '作弊器', '外挂', '破解',
]


def check_local_block(content: str) -> bool:
    """本地违禁词检测（同步）"""
    lower = content.lower()
    for word in LOCAL_BLOCKED_WORDS:
        if word.lower() in lower:
            return True
    return False


def filter_local_block(content: str) -> str:
    """本地违禁词过滤并替换"""
    filtered = content
    for word in LOCAL_BLOCKED_WORDS:
        pattern = re.escape(word)
        filtered = re.sub(pattern, '*' * len(word), filtered, flags=re.IGNORECASE)
    return filtered


async def check_sensitive_word(content: str) -> dict:
    """
    敏感词检测入口
    目前仅使用本地违禁词检测
    第三方API（阿里云/腾讯云）待配置key后启用
    """
    # 本地违禁词检测
    if check_local_block(content):
        return {"blocked": True, "filtered": filter_local_block(content), "source": "local"}

    # TODO: 第三方API检测（配置key后启用）
    # settings = get_settings()
    # aliyun_key = getattr(settings, 'ALIYUN_ACCESS_KEY_ID', None) or getattr(settings, 'ALIYUN_API_KEY', None)
    # if aliyun_key:
    #     aliyun_result = await _check_aliyun(content, settings)
    #     if aliyun_result["blocked"]:
    #         return aliyun_result
    # tencent_id = getattr(settings, 'TENCENT_SECRET_ID', None)
    # if tencent_id:
    #     tencent_result = await _check_tencent(content, settings)
    #     if tencent_result["blocked"]:
    #         return tencent_result

    return {"blocked": False, "filtered": content, "source": "pass"}


async def _check_aliyun(content: str, settings) -> dict:
    """
    阿里云文本内容安全API
    文档: https://help.aliyun.com/document_detail/28417.html
    """
    import hashlib

    access_key_id = getattr(settings, 'ALIYUN_ACCESS_KEY_ID', None) or getattr(settings, 'ALIYUN_API_KEY', None)
    access_key_secret = getattr(settings, 'ALIYUN_ACCESS_KEY_SECRET', None)
    region = getattr(settings, 'ALIYUN_REGION', 'cn-shanghai')
    endpoint = f"https://green.{region}.aliyuncs.com"

    if not access_key_id or not access_key_secret:
        return {"blocked": False, "filtered": content, "source": "aliyun"}

    # 构造请求参数
    import json
    payload = json.dumps({"content": content})

    # 签名（简化版，实际使用阿里云SDK更可靠）
    headers = {
        "x-sdk-invocation-id": str(hashlib.uuid4()),
        "x-sdk-return": "1",
        "Content-Type": "application/json",
    }

    url = f"{endpoint}/green/sensitiveword/check"
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=payload.encode(), headers=headers) as resp:
            if resp.status != 200:
                raise Exception(f"Aliyun API error: {resp.status}")
            result = await resp.json()

            # 阿里云返回格式处理
            if result.get("code") == 200:
                if result.get("data", {}).get("sensitive"):
                    return {
                        "blocked": True,
                        "filtered": filter_local_block(content),
                        "source": "aliyun",
                        "labels": result.get("data", {}).get("labels", []),
                    }

    return {"blocked": False, "filtered": content, "source": "aliyun"}


async def _check_tencent(content: str, settings) -> dict:
    """
    腾讯云文本内容安全API
    文档: https://cloud.tencent.com/document/product/1124/64508
    """
    from tencentcloud.common import credential
    from tencentcloud.common.profile.client_profile import ClientProfile
    from tencentcloud.common.profile.http_profile import HttpProfile
    from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
    from tencentcloud.tms.v20201229 import tms_client, models

    secret_id = getattr(settings, 'TENCENT_SECRET_ID', None)
    secret_key = getattr(settings, 'TENCENT_SECRET_KEY', None)
    region = getattr(settings, 'TENCENT_REGION', 'ap-guangzhou')

    if not secret_id or not secret_key:
        return {"blocked": False, "filtered": content, "source": "tencent"}

    try:
        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile()
        http_profile.endpoint = "tms.tencentcloudapi.com"

        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile

        client = tms_client.TmsClient(cred, region, client_profile)

        req = models.TextModerationRequest()
        req.Content = content.encode('utf-8').decode('latin-1')

        resp = client.TextModeration(req)

        # 腾讯云返回: Suggestion = "Pass", "Review", "Block"
        if resp.Suggestion == "Block":
            return {
                "blocked": True,
                "filtered": filter_local_block(content),
                "source": "tencent",
                "labels": [str(resp.Label)] if resp.Label else [],
            }

    except TencentCloudSDKException:
        pass

    return {"blocked": False, "filtered": content, "source": "tencent"}
