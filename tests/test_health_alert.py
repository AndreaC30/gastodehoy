"""Health alert decision without the network. curl and mail are fakes."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "health-alert.sh"


def _run(tmp: Path, *, code: str, email: str | None, with_mail: bool) -> subprocess.CompletedProcess[str]:
    bin_dir = tmp / "bin"
    bin_dir.mkdir(exist_ok=True)
    curl = bin_dir / "curl"
    curl.write_text(
        "#!/bin/sh\nprintf '%s' \"${FAKE_HTTP_CODE:-200}\"\n",
        encoding="utf-8",
    )
    curl.chmod(0o755)
    if with_mail:
        mail = bin_dir / "mail"
        mail.write_text(
            "#!/bin/sh\n"
            "printf '%s\\n' \"$*\" >> \"$MAIL_CAPTURE\"\n"
            "cat >> \"$MAIL_CAPTURE\"\n"
            "printf '\\n---\\n' >> \"$MAIL_CAPTURE\"\n",
            encoding="utf-8",
        )
        mail.chmod(0o755)
    env = os.environ.copy()
    env.pop("ADMIN_NOTIFY_EMAIL", None)
    # /usr/sbin (sendmail) and, without a fake, /usr/bin/mail stay off PATH.
    env["PATH"] = f"{bin_dir}:/bin" + (":/usr/bin" if with_mail else "")
    env["FAKE_HTTP_CODE"] = code
    env["HEALTH_URL"] = "http://health.test/health"
    env["HEALTH_LOG"] = str(tmp / "health.log")
    env["HEALTH_STATE"] = str(tmp / "state")
    env["MAIL_CAPTURE"] = str(tmp / "mail.txt")
    if email is not None:
        env["ADMIN_NOTIFY_EMAIL"] = email
    return subprocess.run(
        ["bash", str(SCRIPT)],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def test_success_stays_quiet(tmp_path: Path) -> None:
    result = _run(tmp_path, code="200", email="admin@example.com", with_mail=True)
    assert result.returncode == 0
    assert result.stdout == ""
    assert result.stderr == ""
    assert not (tmp_path / "health.log").exists()
    assert not (tmp_path / "mail.txt").exists()
    assert not (tmp_path / "state").exists()


def test_failure_logs_and_mails_once(tmp_path: Path) -> None:
    first = _run(tmp_path, code="503", email="admin@example.com", with_mail=True)
    assert first.returncode == 0
    assert first.stdout == ""
    log = (tmp_path / "health.log").read_text(encoding="utf-8").splitlines()
    assert len(log) == 1
    assert "health check failed" in log[0]
    assert "http=503" in log[0]
    mail = (tmp_path / "mail.txt").read_text(encoding="utf-8")
    assert mail.count("---") == 1
    assert "admin@example.com" in mail
    assert (tmp_path / "state").is_file()

    second = _run(tmp_path, code="000", email="admin@example.com", with_mail=True)
    assert second.returncode == 0
    log = (tmp_path / "health.log").read_text(encoding="utf-8").splitlines()
    assert len(log) == 2
    assert "http=000" in log[1]
    assert (tmp_path / "mail.txt").read_text(encoding="utf-8").count("---") == 1

    recovered = _run(tmp_path, code="200", email="admin@example.com", with_mail=True)
    assert recovered.returncode == 0
    assert recovered.stdout == ""
    assert len((tmp_path / "health.log").read_text(encoding="utf-8").splitlines()) == 2
    assert (tmp_path / "mail.txt").read_text(encoding="utf-8").count("---") == 1
    assert not (tmp_path / "state").exists()


def test_failure_without_mailer_only_logs(tmp_path: Path) -> None:
    result = _run(tmp_path, code="503", email="admin@example.com", with_mail=False)
    assert result.returncode == 0
    assert (tmp_path / "health.log").is_file()
    assert not (tmp_path / "mail.txt").exists()
    assert not (tmp_path / "state").exists()
