from __future__ import annotations

from datetime import datetime, timedelta
from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from ..config import get_settings
from ..database import get_db
from ..dependencies import get_current_user
from ..models import AuditLog, RefreshToken, User, UserRole
from ..schemas import (
    TokenOut,
    TokenRefreshIn,
    UserLoginIn,
    UserOut,
    UserRegisterIn,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterIn, db: Session = Depends(get_db)):
    """Register a new user account. Default role is buyer."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        display_name=payload.display_name,
        role=UserRole.BUYER,
    )
    db.add(user)
    db.flush()

    db.add(AuditLog(
        actor_id=user.id,
        action="user.register",
        resource_type="user",
        resource_id=user.id,
        detail=f"User registered with email {payload.email}",
    ))

    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(payload: UserLoginIn, db: Session = Depends(get_db)):
    """Authenticate and return JWT access + refresh tokens."""
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")

    # Revoke all previous refresh tokens for this user
    for token in db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked.is_(False),
        )
    ):
        token.revoked = True

    settings = get_settings()
    access_token = create_access_token(str(user.id))
    refresh_token_str = create_refresh_token(str(user.id))
    token_hash = sha256(refresh_token_str.encode()).hexdigest()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    ))
    db.commit()

    return TokenOut(
        access_token=access_token,
        refresh_token=refresh_token_str,
    )


@router.post("/refresh", response_model=TokenOut)
def refresh(payload: TokenRefreshIn, db: Session = Depends(get_db)):
    """Issue new access and refresh tokens using a valid refresh token."""
    try:
        payload_data = decode_token(payload.refresh_token)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    if payload_data.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not a refresh token")

    user_id = payload_data.get("sub")
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject")

    try:
        uid = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject")

    token_hash = sha256(payload.refresh_token.encode()).hexdigest()
    stored = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    if stored is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token revoked or not found")

    user = db.get(User, uid)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    # Revoke old refresh token
    stored.revoked = True

    # Issue new tokens
    settings = get_settings()
    new_access = create_access_token(str(uid))
    new_refresh = create_refresh_token(str(uid))
    new_hash = sha256(new_refresh.encode()).hexdigest()
    db.add(RefreshToken(
        user_id=uid,
        token_hash=new_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days),
    ))
    db.commit()

    return TokenOut(
        access_token=new_access,
        refresh_token=new_refresh,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: TokenRefreshIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke the given refresh token."""
    token_hash = sha256(payload.refresh_token.encode()).hexdigest()
    stored = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    if stored is not None:
        stored.revoked = True
        db.commit()


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return current_user
