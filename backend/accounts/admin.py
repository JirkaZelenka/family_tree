from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .lineages import (
    canonicalize_lineage_keys,
    dedupe_lineage_keys,
    discover_lineage_keys,
    sort_lineage_keys,
)
from .models import UserProfile


class LooseMultipleChoiceField(forms.MultipleChoiceField):
    def valid_value(self, value: str) -> bool:
        return bool(str(value).strip())


class LineageCheckboxSelectMultiple(forms.CheckboxSelectMultiple):
    class Media:
        js = ("accounts/lineage_checkboxes.js",)

    def render(self, name, value, attrs=None, renderer=None):
        attrs = attrs or {}
        checkbox_list = super().render(name, value, attrs, renderer)
        select_all_id = f"{attrs.get('id', name)}_select_all"
        toggle = format_html(
            '<label for="{}" style="display:block;font-weight:600;margin:0 0 0.6em">'
            '<input type="checkbox" class="lineage-select-all" id="{}" '
            'data-target-name="{}" style="margin-right:0.35em">'
            "Všechny rody</label>",
            select_all_id,
            select_all_id,
            name,
        )
        return mark_safe(f"{toggle}{checkbox_list}")


class UserProfileForm(forms.ModelForm):
    allowed_lineages = LooseMultipleChoiceField(
        required=False,
        widget=LineageCheckboxSelectMultiple,
        label="Viditelné rody",
        help_text=(
            "Zaškrtněte „Všechny rody“ a případně odeberte jednotlivé. "
            "Admin (personál / superuser) vidí všechny rody vždy. "
            "Prázdný výběr = žádný rod."
        ),
    )

    class Meta:
        model = UserProfile
        fields = ("role", "allowed_lineages")

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        discovered = discover_lineage_keys()
        current = list(self.instance.allowed_lineages or []) if self.instance.pk else []
        # Jedna volba na rod (Zelenkovi, ne zelenkovi + Zelenkovi); casing z vaultu.
        keys = canonicalize_lineage_keys(
            dedupe_lineage_keys([*discovered, *current]),
            discovered,
        )
        self.fields["allowed_lineages"].choices = [(key, key) for key in keys]
        self.fields["allowed_lineages"].initial = canonicalize_lineage_keys(current, keys)
        self._lineage_choices = keys

    def clean_allowed_lineages(self) -> list[str]:
        values = self.cleaned_data.get("allowed_lineages") or []
        cleaned = [str(value).strip() for value in values if str(value).strip()]
        choices = getattr(self, "_lineage_choices", discover_lineage_keys())
        return canonicalize_lineage_keys(cleaned, choices)


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

    def save_formset(self, request, form, formset, change):
        # post_save signal already creates UserProfile on user insert; updating
        # that row avoids UNIQUE constraint failed: accounts_userprofile.user_id.
        if formset.model is UserProfile:
            instances = formset.save(commit=False)
            for instance in instances:
                UserProfile.objects.update_or_create(
                    user=form.instance,
                    defaults={
                        "role": instance.role,
                        "allowed_lineages": instance.allowed_lineages,
                    },
                )
            formset.save_m2m()
            return
        formset.save()

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
        keys = sort_lineage_keys(list(getattr(profile, "allowed_lineages", None) or []))
        return ", ".join(keys) if keys else "—"


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
