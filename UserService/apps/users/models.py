from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField("手机号", max_length=11, unique=True, null=True, blank=True)
    avatar = models.URLField("头像", max_length=256, null=True, blank=True)