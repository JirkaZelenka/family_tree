from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    verbose_name = "Role v aplikaci"
    verbose_name_plural = "Role v aplikaci"


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "app_role",
        "is_staff",
        "is_superuser",
        "is_active",
    )

    @admin.display(description="Role")
    def app_role(self, obj: User) -> str:
        if obj.is_superuser or obj.is_staff:
            return "admin"
        profile = getattr(obj, "profile", None)
        return profile.role if profile else UserProfile.Role.READONLY


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
