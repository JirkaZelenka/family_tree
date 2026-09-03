import json

from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import UserProfile
from .views import user_payload


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

    def test_admin_payload_and_admin_page(self) -> None:
        payload = user_payload(self.admin)
        self.assertEqual(payload["role"], "admin")
        self.assertTrue(payload["isAdmin"])
        self.assertTrue(payload["canEditSavedViews"])

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
