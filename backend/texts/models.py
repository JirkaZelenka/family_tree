from django.conf import settings
from django.db import models


class TextComment(models.Model):
    text_id = models.CharField(max_length=255, db_index=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="text_comments",
    )
    start = models.PositiveIntegerField()
    end = models.PositiveIntegerField()
    quote = models.TextField()
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start", "created_at"]

    def __str__(self) -> str:
        return f"{self.text_id}@{self.start}-{self.end} by {self.author_id}"
