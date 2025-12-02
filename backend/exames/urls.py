from django.urls import path
from .views import UploadExameView

urlpatterns = [
    path('upload/', UploadExameView.as_view(), name='upload_exame'),
]