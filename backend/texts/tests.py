import json

from django.contrib.auth.models import User
from django.test import Client, TestCase

from accounts.models import UserProfile
from .models import TextComment


class TextCommentApiTests(TestCase):
    def setUp(self) -> None:
        self.client = Client(enforce_csrf_checks=True)
        self.reader_a = User.objects.create_user("reader_a", password="secret")
        self.reader_a.profile.role = UserProfile.Role.READONLY
        self.reader_a.profile.save()

        self.reader_b = User.objects.create_user("reader_b", password="secret")
        self.reader_b.profile.role = UserProfile.Role.READONLY
        self.reader_b.profile.save()

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

    def _create_comment(self, text_id: str = "pokus", **overrides):
        payload = {
            "start": 10,
            "end": 20,
            "quote": "ukázkový úsek",
            "body": "můj komentář",
            **overrides,
        }
        token = self.client.cookies["csrftoken"].value
        return self.client.post(
            f"/api/texts/{text_id}/comments",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_create_requires_login(self) -> None:
        token = self._csrf()
        response = self.client.post(
            "/api/texts/pokus/comments",
            data=json.dumps(
                {"start": 0, "end": 5, "quote": "a", "body": "b"},
            ),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 401)

    def test_author_sees_own_comment_other_does_not(self) -> None:
        self._login("reader_a")
        create = self._create_comment()
        self.assertEqual(create.status_code, 201, create.content)
        comment_id = create.json()["id"]

        listed = self.client.get("/api/texts/pokus/comments")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()["comments"]), 1)
        self.assertEqual(listed.json()["comments"][0]["id"], comment_id)

        self.client.logout()
        self._login("reader_b")
        listed_b = self.client.get("/api/texts/pokus/comments")
        self.assertEqual(listed_b.status_code, 200)
        self.assertEqual(listed_b.json()["comments"], [])

    def test_admin_sees_all_comments(self) -> None:
        self._login("reader_a")
        self._create_comment(body="od A")
        self.client.logout()

        self._login("reader_b")
        self._create_comment(body="od B", start=30, end=40, quote="jiný")
        self.client.logout()

        self._login("admin")
        listed = self.client.get("/api/texts/pokus/comments")
        self.assertEqual(listed.status_code, 200)
        bodies = {c["body"] for c in listed.json()["comments"]}
        self.assertEqual(bodies, {"od A", "od B"})

    def test_author_can_delete_own_comment(self) -> None:
        self._login("reader_a")
        create = self._create_comment()
        comment_id = create.json()["id"]
        token = self.client.cookies["csrftoken"].value
        deleted = self.client.delete(
            f"/api/texts/comments/{comment_id}",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(TextComment.objects.filter(pk=comment_id).exists())

    def test_other_user_cannot_delete(self) -> None:
        self._login("reader_a")
        create = self._create_comment()
        comment_id = create.json()["id"]
        self.client.logout()

        self._login("reader_b")
        token = self.client.cookies["csrftoken"].value
        deleted = self.client.delete(
            f"/api/texts/comments/{comment_id}",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(deleted.status_code, 403)
        self.assertTrue(TextComment.objects.filter(pk=comment_id).exists())

    def test_admin_can_delete_any(self) -> None:
        self._login("reader_a")
        create = self._create_comment()
        comment_id = create.json()["id"]
        self.client.logout()

        self._login("admin")
        token = self.client.cookies["csrftoken"].value
        deleted = self.client.delete(
            f"/api/texts/comments/{comment_id}",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(TextComment.objects.filter(pk=comment_id).exists())

    def test_nested_text_id_path(self) -> None:
        self._login("reader_a")
        response = self._create_comment(text_id="rod/pokus")
        self.assertEqual(response.status_code, 201)
        listed = self.client.get("/api/texts/rod/pokus/comments")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()["comments"]), 1)
