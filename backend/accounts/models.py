from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        READONLY = "readonly", "Pouze čtení"
        EDITOR = "editor", "Editor"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.READONLY,
        help_text="Role v aplikaci. Admin vzniká zaškrtnutím „Personál webu“ / superuser.",
    )

    class Meta:
        verbose_name = "Profil"
        verbose_name_plural = "Profily"

    def __str__(self) -> str:
        return f"{self.user.username} ({self.get_role_display()})"
