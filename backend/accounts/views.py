import json

from django.contrib.auth import authenticate, login, logout
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import UserProfile


def user_payload(user) -> dict:
    is_admin = bool(user.is_staff or user.is_superuser)
    profile = getattr(user, "profile", None)
    profile_role = profile.role if profile else UserProfile.Role.READONLY
    if is_admin:
        role = "admin"
    else:
        role = profile_role
    return {
        "username": user.username,
        "role": role,
        "isAdmin": is_admin,
        "canEditSavedViews": is_admin or profile_role == UserProfile.Role.EDITOR,
    }


def _json_body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


@ensure_csrf_cookie
@require_GET
def csrf_view(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"detail": "ok"})


@ensure_csrf_cookie
@require_GET
def me_view(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Nepřihlášen."}, status=401)
    return JsonResponse(user_payload(request.user))


@require_POST
def login_view(request: HttpRequest) -> JsonResponse:
    data = _json_body(request)
    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "")
    if not username or not password:
        return JsonResponse(
            {"error": "Zadejte jméno a heslo."},
            status=400,
        )
    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_active:
        return JsonResponse(
            {"error": "Neplatné jméno nebo heslo."},
            status=400,
        )
    login(request, user)
    return JsonResponse(user_payload(user))


@require_POST
def logout_view(request: HttpRequest) -> JsonResponse:
    logout(request)
    return JsonResponse({"detail": "ok"})
