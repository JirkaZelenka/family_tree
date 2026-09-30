import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_http_methods

from .models import TextComment


def _is_admin(user) -> bool:
    return bool(user.is_authenticated and (user.is_staff or user.is_superuser))


def _json_body(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _comment_payload(comment: TextComment, request_user) -> dict:
    return {
        "id": comment.id,
        "textId": comment.text_id,
        "start": comment.start,
        "end": comment.end,
        "quote": comment.quote,
        "body": comment.body,
        "authorUsername": comment.author.username,
        "createdAt": comment.created_at.isoformat(),
        "canDelete": bool(
            request_user.is_authenticated
            and (comment.author_id == request_user.id or _is_admin(request_user))
        ),
    }


def _visible_queryset(user):
    if not user.is_authenticated:
        return TextComment.objects.none()
    if _is_admin(user):
        return TextComment.objects.all()
    return TextComment.objects.filter(author=user)


@require_http_methods(["GET", "POST"])
def text_comments_view(request: HttpRequest, text_id: str) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Nepřihlášen."}, status=401)

    cleaned_id = (text_id or "").strip()
    if not cleaned_id:
        return JsonResponse({"error": "Chybí text_id."}, status=400)

    if request.method == "GET":
        comments = _visible_queryset(request.user).filter(text_id=cleaned_id)
        return JsonResponse(
            {
                "comments": [
                    _comment_payload(comment, request.user) for comment in comments
                ]
            }
        )

    data = _json_body(request)
    try:
        start = int(data.get("start"))
        end = int(data.get("end"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "Neplatný rozsah."}, status=400)

    quote = str(data.get("quote") or "").strip()
    body = str(data.get("body") or "").strip()
    if end <= start:
        return JsonResponse({"error": "Konec musí být za začátkem."}, status=400)
    if not quote:
        return JsonResponse({"error": "Chybí citace."}, status=400)
    if not body:
        return JsonResponse({"error": "Chybí text komentáře."}, status=400)

    comment = TextComment.objects.create(
        text_id=cleaned_id,
        author=request.user,
        start=start,
        end=end,
        quote=quote,
        body=body,
    )
    return JsonResponse(_comment_payload(comment, request.user), status=201)


@require_http_methods(["DELETE"])
def text_comment_detail_view(request: HttpRequest, comment_id: int) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Nepřihlášen."}, status=401)

    try:
        comment = TextComment.objects.select_related("author").get(pk=comment_id)
    except TextComment.DoesNotExist:
        return JsonResponse({"error": "Komentář neexistuje."}, status=404)

    if comment.author_id != request.user.id and not _is_admin(request.user):
        return JsonResponse({"error": "Nemáte oprávnění smazat komentář."}, status=403)

    comment.delete()
    return JsonResponse({"detail": "ok"})
