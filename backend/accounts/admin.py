from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .lineages import discover_lineage_keys
from .models import UserProfile


class LooseMultipleChoiceField(forms.MultipleChoiceField):
    def valid_value(self, value: str) -> bool:
        return bool(str(value).strip())


class UserProfileForm(forms.ModelForm):
    allowed_lineages = LooseMultipleChoiceField(
        required=False,
        widget=forms.CheckboxSelectMultiple,
        label="Viditelné rody",
        help_text="Admin vidí všechny rody. Ostatní vidí jen zaškrtnuté. Prázdný výběr = žádný rod.",
    )

    class Meta:
        model = UserProfile
        fields = ("role", "allowed_lineages")

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        current = list(self.instance.allowed_lineages or []) if self.instance.pk else []
        keys = sorted(set(discover_lineage_keys()) | set(current))
        self.fields["allowed_lineages"].choices = [(key, key) for key in keys]
        self.fields["allowed_lineages"].initial = current

    def clean_allowed_lineages(self) -> list[str]:
        values = self.cleaned_data.get("allowed_lineages") or []
        return [str(value).strip() for value in values if str(value).strip()]


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    form = UserProfileForm
    can_delete = False
    extra = 0
    verbose_name = "Role a viditelné rody"
    verbose_name_plural = "Role a viditelné rody"


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "app_role",
        "visible_lineages",
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

    @admin.display(description="Rody")
    def visible_lineages(self, obj: User) -> str:
        if obj.is_superuser or obj.is_staff:
            return "vše"
        profile = getattr(obj, "profile", None)
        keys = list(getattr(profile, "allowed_lineages", None) or [])
        return ", ".join(keys) if keys else "—"


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
