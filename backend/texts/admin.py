from django.contrib import admin

from .models import TextComment


@admin.register(TextComment)
class TextCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "text_id", "author", "start", "end", "created_at")
    list_filter = ("text_id", "author")
    search_fields = ("quote", "body", "text_id", "author__username")
    readonly_fields = ("created_at",)
