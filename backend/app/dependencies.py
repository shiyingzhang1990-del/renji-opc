from __future__ import annotations

from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from .auth import decode_token
from .database import get_db
from .models import Merchant, User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


class AuthError(HTTPException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def get_current_user(
    token: str | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT access token."""
    if token is None:
        raise AuthError("Missing authentication token")
    try:
        payload = decode_token(token.credentials)
    except JWTError:
        raise AuthError("Invalid or expired token")

    token_type = payload.get("type")
    if token_type != "access":
        raise AuthError("Only access tokens are accepted")

    user_id = payload.get("sub")
    if user_id is None:
        raise AuthError("Token missing subject")

    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        raise AuthError("Invalid token subject")

    user = db.get(User, uid)
    if user is None or not user.is_active:
        raise AuthError("User not found or inactive")
    return user


def require_roles(*roles: UserRole) -> Callable:
    """Dependency factory: require the current user to have one of the given roles."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError(
                f"Requires one of: {', '.join(r.value for r in roles)}"
            )
        return current_user

    return role_checker


def require_platform_or_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be platform_operator or super_admin."""
    if current_user.role not in {UserRole.PLATFORM_OPERATOR, UserRole.SUPER_ADMIN}:
        raise ForbiddenError("Only platform operators can perform this action")
    return current_user


def require_same_merchant_or_admin(target_merchant_id: int | None) -> Callable:
    """Dependency factory: ensure the user belongs to the same merchant or is super_admin."""

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.SUPER_ADMIN:
            return current_user
        if current_user.merchant_id != target_merchant_id:
            raise ForbiddenError("Cross-tenant access denied")
        return current_user

    return checker


def scope_community(required_community_id: int | None, db: Session, current_user: User) -> None:
    """Raise ForbiddenError if the user cannot access the given community scope."""
    if current_user.role == UserRole.SUPER_ADMIN:
        return
    if current_user.role == UserRole.COMMUNITY_OPERATOR:
        if current_user.community_id != required_community_id:
            raise ForbiddenError("Cross-community access denied")
        return
    if current_user.role == UserRole.PLATFORM_OPERATOR:
        return
    if current_user.merchant_id is not None:
        merchant = db.get(Merchant, current_user.merchant_id)
        if merchant is not None and merchant.community_id != required_community_id:
            raise ForbiddenError("Cross-community access denied")
        return
    raise ForbiddenError("Insufficient scope")
