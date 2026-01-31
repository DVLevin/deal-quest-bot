"""Fernet encryption for API keys."""

from __future__ import annotations

import logging

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


class CryptoService:
    """Encrypt/decrypt API keys using Fernet symmetric encryption."""

    def __init__(self, encryption_key: str) -> None:
        self._fernet = Fernet(encryption_key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str | None:
        try:
            return self._fernet.decrypt(ciphertext.encode()).decode()
        except (InvalidToken, Exception) as e:
            logger.error("Failed to decrypt API key: %s", e)
            return None
