from django.urls import path

from . import views

urlpatterns = [
    path("comments/<int:comment_id>", views.text_comment_detail_view, name="text-comment-detail"),
    path("<path:text_id>/comments", views.text_comments_view, name="text-comments"),
]
