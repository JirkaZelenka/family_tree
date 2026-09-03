from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Family Tree Graph"
admin.site.site_title = "Family Tree Admin"
admin.site.index_title = "Správa účtů"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
]
