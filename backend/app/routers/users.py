from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import (
    get_current_user,
    require_platform_or_super_admin,
    require_roles,
)
from ..models import User, UserRole
from ..schemas import AuditLogOut, UserOut, UserRegisterIn, ORMModel
from ..auth import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserOut])
def list_users(
    role: UserRole | None = Query(default=None),
    merchant_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_or_super_admin),
):
    """List users (platform_operator or super_admin only)."""
    stmt = select(User).order_by(User.id.desc())
    if role:
        stmt = stmt.where(User.role == role)
    if merchant_id:
        stmt = stmt.where(User.merchant_id == merchant_id)

    offset = (page - 1) * page_size
    users = db.scalars(stmt.offset(offset).limit(page_size)).all()
    return list(users)


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a user by ID. Users can see their own profile; admins can see any."""
    if current_user.id != user_id and current_user.role not in {
        UserRole.PLATFORM_OPERATOR, UserRole.SUPER_ADMIN
    }:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot view other user's profile")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.patch("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: int,
    new_role: UserRole,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_or_super_admin),
):
    """Update a user's role (platform_operator or super_admin only)."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    user.role = new_role
    db.commit()
    db.refresh(user)
    return user
