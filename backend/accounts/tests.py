import json

from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import UserProfile
from .views import user_payload
from .lineages import discover_lineage_keys


class AuthApiTests(TestCase):
    def setUp(self) -> None:
        self.client = Client(enforce_csrf_checks=True)
        self.reader = User.objects.create_user("reader", password="secret")
        self.reader.profile.role = UserProfile.Role.READONLY
        self.reader.profile.save()

        self.editor = User.objects.create_user("editor", password="secret")
        self.editor.profile.role = UserProfile.Role.EDITOR
        self.editor.profile.save()

        self.admin = User.objects.create_superuser("admin", "admin@example.com", "secret")

    def _csrf(self) -> str:
        response = self.client.get("/api/auth/csrf")
        self.assertEqual(response.status_code, 200)
        return response.cookies["csrftoken"].value

    def _login(self, username: str, password: str = "secret"):
        token = self._csrf()
        return self.client.post(
            "/api/auth/login",
            data=json.dumps({"username": username, "password": password}),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_unauthenticated_me_returns_401(self) -> None:
        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_bad_password(self) -> None:
        response = self._login("editor", "wrong")
        self.assertEqual(response.status_code, 400)

    def test_login_reader_cannot_edit_saved_views(self) -> None:
        response = self._login("reader")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["role"], "readonly")
        self.assertFalse(body["canEditSavedViews"])
        self.assertFalse(body["isAdmin"])
        self.assertEqual(body["allowedLineages"], [])

        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["username"], "reader")

    def test_login_editor_can_edit_saved_views(self) -> None:
        response = self._login("editor")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["role"], "editor")
        self.assertTrue(body["canEditSavedViews"])
        self.assertFalse(body["isAdmin"])
        self.assertEqual(body["allowedLineages"], [])

    def test_admin_payload_and_admin_page(self) -> None:
        payload = user_payload(self.admin)
        self.assertEqual(payload["role"], "admin")
        self.assertTrue(payload["isAdmin"])
        self.assertTrue(payload["canEditSavedViews"])
        self.assertIsNone(payload["allowedLineages"])

        response = self._login("admin")
        self.assertEqual(response.status_code, 200)
        admin_page = self.client.get("/admin/")
        self.assertEqual(admin_page.status_code, 200)

    def test_logout(self) -> None:
        self._login("editor")
        token = self.client.cookies["csrftoken"].value
        response = self.client.post(
            "/api/auth/logout",
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 401)

    def test_profile_created_for_new_user(self) -> None:
        user = User.objects.create_user("fresh", password="secret")
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        self.assertEqual(user.profile.role, UserProfile.Role.READONLY)
        self.assertEqual(user.profile.allowed_lineages, [])

    def test_admin_can_add_user_with_profile_inline(self) -> None:
        """Signal + admin inline must not double-insert UserProfile."""
        self.client.force_login(self.admin)
        add_page = self.client.get("/admin/auth/user/add/")
        self.assertEqual(add_page.status_code, 200)
        csrf = self.client.cookies["csrftoken"].value
        response = self.client.post(
            "/admin/auth/user/add/",
            {
                "csrfmiddlewaretoken": csrf,
                "username": "tester",
                "password1": "complex-pass-123",
                "password2": "complex-pass-123",
                "profile-TOTAL_FORMS": "1",
                "profile-INITIAL_FORMS": "0",
                "profile-MIN_NUM_FORMS": "0",
                "profile-MAX_NUM_FORMS": "1",
                "profile-0-role": UserProfile.Role.EDITOR,
                "profile-0-allowed_lineages": ["novakovi"],
                "_save": "Save",
            },
        )
        self.assertEqual(response.status_code, 302, response.content.decode()[:500])
        user = User.objects.get(username="tester")
        self.assertEqual(UserProfile.objects.filter(user=user).count(), 1)
        self.assertEqual(user.profile.role, UserProfile.Role.EDITOR)
        self.assertEqual(user.profile.allowed_lineages, ["novakovi"])

    def test_allowed_lineages_in_me_payload(self) -> None:
        self.editor.profile.allowed_lineages = ["novakovi"]
        self.editor.profile.save()
        response = self._login("editor")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["allowedLineages"], ["novakovi"])


class LineageDiscoveryTests(TestCase):
    def test_discovers_keys_from_live_data_only(self) -> None:
        keys = discover_lineage_keys()
        folds = {key.casefold() for key in keys}
        self.assertIn("zelenkovi", folds)
        # Šablonové Novák/Dvořák se do adminu nesmí dostat.
        self.assertNotIn("novakovi", folds)
        self.assertNotIn("dvorakovi", folds)

    def test_discover_has_no_case_duplicates(self) -> None:
        keys = discover_lineage_keys()
        folds = [key.casefold() for key in keys]
        self.assertEqual(len(folds), len(set(folds)))

    def test_canonicalize_prefers_vault_casing(self) -> None:
        from .lineages import canonicalize_lineage_keys, dedupe_lineage_keys

        merged = dedupe_lineage_keys(["zelenkovi", "Zelenkovi", "spilkovi"])
        self.assertEqual(merged, ["spilkovi", "Zelenkovi"])
        canon = canonicalize_lineage_keys(
            ["zelenkovi", "SPILKOVI"],
            ["Zelenkovi", "Spilkovi"],
        )
        self.assertEqual(canon, ["Spilkovi", "Zelenkovi"])

    def test_czech_alphabet_sort_order(self) -> None:
        from .lineages import sort_lineage_keys

        keys = sort_lineage_keys(
            ["Zelenkovi", "Spilkovi", "Špičkovi", "Hynkovi", "Chudobovi", "Bartoňovi"],
        )
        self.assertEqual(
            keys,
            ["Bartoňovi", "Hynkovi", "Chudobovi", "Spilkovi", "Špičkovi", "Zelenkovi"],
        )
        self.assertLess(keys.index("Spilkovi"), keys.index("Špičkovi"))
        self.assertLess(keys.index("Špičkovi"), keys.index("Zelenkovi"))
        self.assertLess(keys.index("Hynkovi"), keys.index("Chudobovi"))

