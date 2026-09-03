from django.urls import path

from . import views

urlpatterns = [
    path("csrf", views.csrf_view, name="auth-csrf"),
    path("me", views.me_view, name="auth-me"),
    path("login", views.login_view, name="auth-login"),
    path("logout", views.logout_view, name="auth-logout"),
]
