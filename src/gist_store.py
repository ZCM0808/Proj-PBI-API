"""
GitHub Secret Gist 远程持久化状态存储模块
彻底解决 Render/Docker 临时无状态容器重启导致设备锁定时长与配额丢失的问题。
"""

import asyncio
import json
import logging
import os
import time
from typing import Any, Dict

import requests

from src.config import load_settings

logger = logging.getLogger(__name__)

# 专属 Secret Gist 配置 (Gist 资源唯一标识)
DEFAULT_GIST_ID = "37c50831834ef4c2fb96d2774c5ca113"
GIST_FILE_NAME = "pbi_device_lockouts.json"

_LAST_SYNC_TIME: float = 0.0
_IS_SYNCING: bool = False


def _get_gist_config() -> tuple[str, str]:
    gist_id = os.getenv("LOCKOUTS_GIST_ID", DEFAULT_GIST_ID).strip()
    pat = (
        os.getenv("GITHUB_PAT")
        or os.getenv("GITHUB_TOKEN")
        or load_settings().get("GITHUB_PAT", "")
    ).strip()
    return gist_id, pat


def _merge_lockout_records(local: Dict[str, Any], remote: Dict[str, Any]) -> Dict[str, Any]:
    """智能双向合并本地与云端 Gist 的记录，确保锁定与累计秒数绝不倒退"""
    merged = dict(local)
    for dev_id, r_rec in remote.items():
        if not isinstance(r_rec, dict):
            continue
        if dev_id not in merged:
            merged[dev_id] = r_rec
            continue

        l_rec = merged[dev_id]
        if not isinstance(l_rec, dict):
            merged[dev_id] = r_rec
            continue

        # 1. 尝试次数与锁定时间取最大值
        merged[dev_id]["attempts"] = max(l_rec.get("attempts", 0), r_rec.get("attempts", 0))
        merged[dev_id]["locked_until"] = max(l_rec.get("locked_until", 0), r_rec.get("locked_until", 0))

        # 2. 每日用时合并
        l_usage = l_rec.get("daily_usage", {})
        r_usage = r_rec.get("daily_usage", {})
        if l_usage and not r_usage:
            merged[dev_id]["daily_usage"] = l_usage
        elif r_usage and not l_usage:
            merged[dev_id]["daily_usage"] = r_usage
        elif l_usage and r_usage:
            l_date = l_usage.get("date", "")
            r_date = r_usage.get("date", "")
            if l_date > r_date:
                merged[dev_id]["daily_usage"] = l_usage
            elif r_date > l_date:
                merged[dev_id]["daily_usage"] = r_usage
            else:
                # 同一天取最大使用秒数
                max_sec = max(l_usage.get("used_seconds", 0), r_usage.get("used_seconds", 0))
                merged[dev_id]["daily_usage"] = {"date": l_date, "used_seconds": max_sec}

    return merged


def fetch_from_gist(local_path: str = "data/lockouts.json") -> Dict[str, Any]:
    """从 GitHub Secret Gist 获取最新的云端记录，并与本地文件安全合并"""
    local_data: Dict[str, Any] = {}
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                local_data = json.load(f)
        except Exception:
            local_data = {}

    gist_id, pat = _get_gist_config()
    if not pat or not gist_id:
        return local_data

    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Proj-PBI-API-GistStore",
    }
    try:
        resp = requests.get(f"https://api.github.com/gists/{gist_id}", headers=headers, timeout=3.5)
        if resp.status_code == 200:
            files = resp.json().get("files", {})
            file_entry = files.get(GIST_FILE_NAME)
            if file_entry and "content" in file_entry:
                remote_data = json.loads(file_entry["content"])
                merged = _merge_lockout_records(local_data, remote_data)
                # 刷回本地文件持久化
                try:
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    with open(local_path, "w", encoding="utf-8") as f:
                        json.dump(merged, f, indent=2)
                except Exception:
                    pass
                return merged
    except Exception as e:
        logger.warning(f"Failed to fetch lockouts from Gist: {e}")

    return local_data


def push_to_gist_sync(data: Dict[str, Any]) -> bool:
    """同步推送到 GitHub Secret Gist"""
    gist_id, pat = _get_gist_config()
    if not pat or not gist_id:
        return False

    headers = {
        "Authorization": f"token {pat}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Proj-PBI-API-GistStore",
    }
    payload = {
        "files": {
            GIST_FILE_NAME: {
                "content": json.dumps(data, indent=2)
            }
        }
    }
    try:
        resp = requests.patch(f"https://api.github.com/gists/{gist_id}", headers=headers, json=payload, timeout=4.0)
        return resp.status_code == 200
    except Exception as e:
        logger.warning(f"Failed to push lockouts to Gist: {e}")
        return False


async def async_push_to_gist(data: Dict[str, Any], force: bool = False) -> None:
    """非阻塞异步推送到 Gist (带节流控制)"""
    global _LAST_SYNC_TIME, _IS_SYNCING
    now = time.time()
    # 强制同步(如设备锁定、登录成功、上限触发)或间隔超过 120 秒才允许推送
    if not force and (now - _LAST_SYNC_TIME < 120):
        return

    if _IS_SYNCING:
        return

    _IS_SYNCING = True
    _LAST_SYNC_TIME = now

    def _worker():
        global _IS_SYNCING
        try:
            push_to_gist_sync(data)
        finally:
            _IS_SYNCING = False

    await asyncio.to_thread(_worker)
