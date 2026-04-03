"""Password validation utilities."""
import re
from typing import TypedDict


class PasswordStrength(TypedDict):
    score: int  # 0-4 (0=very weak, 4=very strong)
    label: str  # 'very_weak', 'weak', 'fair', 'strong', 'very_strong'
    is_valid: bool  # 是否符合最低要求
    requirements: dict[str, bool]
    messages: list[str]


def validate_password_strength(password: str) -> PasswordStrength:
    """
    Validate password strength.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
    """
    requirements = {
        "min_length": len(password) >= 8,
        "uppercase": bool(re.search(r'[A-Z]', password)),
        "lowercase": bool(re.search(r'[a-z]', password)),
        "digit": bool(re.search(r'\d', password)),
        "special": bool(re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password)),
    }

    # Calculate score
    score = sum(requirements.values())

    # Determine label
    if score == 0:
        label = "very_weak"
    elif score == 1:
        label = "weak"
    elif score == 2:
        label = "fair"
    elif score == 3:
        label = "strong"
    else:
        label = "very_strong"

    # Generate messages
    messages = []
    if not requirements["min_length"]:
        messages.append("密码长度至少8个字符")
    if not requirements["uppercase"]:
        messages.append("包含至少一个大写字母")
    if not requirements["lowercase"]:
        messages.append("包含至少一个小写字母")
    if not requirements["digit"]:
        messages.append("包含至少一个数字")
    if not requirements["special"]:
        messages.append("包含至少一个特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)")

    # Valid if meets minimum requirements (score >= 3)
    is_valid = score >= 3

    return PasswordStrength(
        score=score,
        label=label,
        is_valid=is_valid,
        requirements=requirements,
        messages=messages
    )


def check_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Check if password meets strength requirements.
    Returns (is_valid, error_messages).
    """
    result = validate_password_strength(password)
    return result["is_valid"], result["messages"]
