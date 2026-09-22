"""Laya System 1 Local Decision Engine Module

Provides ultra-low-latency, non-autoregressive, calibrated probability decision
services for Power BI API routing, error triage, and permission guardrails.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Dict, List, Optional

logger = logging.getLogger("pbi_app.laya")

# 确保国内 Hugging Face 镜像端点生效
if "HF_ENDPOINT" not in os.environ:
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"


class LayaDecisionEngine:
    """Thread-safe, lazy-loading singleton decision engine powered by Laya."""

    _instance: Optional[LayaDecisionEngine] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self._agent: Any = None
        self._load_lock = threading.Lock()
        self._initialized = False
        self._init_error: Optional[str] = None

    @classmethod
    def get_instance(cls) -> LayaDecisionEngine:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def is_available(self) -> bool:
        """Check if laya package is installed and importable."""
        import importlib.util
        return importlib.util.find_spec("laya") is not None

    def _get_agent(self) -> Any:
        """Lazy load the agent model."""
        if self._agent is not None:
            return self._agent

        with self._load_lock:
            if self._agent is not None:
                return self._agent
            try:
                import laya  # type: ignore[import-untyped]

                logger.info("Initializing Laya System 1 model (convaiinnovations/laya)...")
                # 加载默认通用端点 (421M 参数)
                self._agent = laya.load("convaiinnovations/laya")
                self._initialized = True
                self._init_error = None
                logger.info("Laya System 1 model successfully loaded into memory.")
                return self._agent
            except Exception as exc:
                self._init_error = str(exc)
                logger.warning(f"Failed to load Laya model: {exc}")
                raise exc

    def get_status(self) -> Dict[str, Any]:
        """Return current engine readiness and memory status."""
        available = self.is_available()
        return {
            "status": "ok",
            "available": available,
            "laya_available": available,
            "initialized": self._agent is not None,
            "model_id": "convaiinnovations/laya",
            "device": "cpu",
            "init_error": self._init_error,
        }

    # =========================================================================
    # 场景 1: API 意图识别与端点自动路由 (Intent Router)
    # =========================================================================
    def route_api_intent(self, query: str) -> Dict[str, Any]:
        """Route user query to the best matching Power BI Admin API category."""
        clean_query = query.strip()
        if not clean_query:
            return {"category": "groups", "confidence": 0.0, "fallback": True}

        if not self.is_available():
            return self._fallback_route(clean_query)

        try:
            agent = self._get_agent()
            state = {"user_intent": clean_query}
            questions = {
                "category": {
                    "type": "choice",
                    "instructions": "Which Power BI Admin API category best fulfills this user intent?",
                    "criteria": {
                        "activity_events": "query tenant activity logs, audit events and user operation history",
                        "groups": "manage workspaces, workspace users, role access and permissions",
                        "datasets": "semantic models, dataset refresh, parameters, datasources and tables",
                        "reports": "reports, pages, export data, rebind and clone reports",
                        "gateways": "on-premises data gateways, cluster status and connection credentials",
                        "pipelines": "deployment pipelines, ALM lifecycle stages and schema diffs",
                        "imports": "import PBIX files, upload model files and deployment status",
                        "capacities": "Fabric and Premium capacities, compute workloads and assignments",
                        "admin": "tenant-wide admin settings, access keys, encryption and policies",
                    },
                }
            }

            res = agent.predict(state, questions)
            ans = res["answers"]["category"]
            choice = str(ans.get("choice", "groups"))
            confidence = float(ans.get("confidence", 0.0))
            probabilities = {k: round(float(v), 3) for k, v in ans.get("probabilities", {}).items()}

            return {
                "category": choice,
                "title": choice.replace("_", " ").title(),
                "confidence": confidence,
                "probabilities": probabilities,
                "fallback": False,
            }
        except Exception as e:
            logger.warning(f"Laya route_api_intent fallback due to: {e}")
            return self._fallback_route(clean_query)

    def _fallback_route(self, query: str) -> Dict[str, Any]:
        """Rule-based fallback when Laya is not loaded."""
        q = query.lower()
        cat = "groups"
        conf = 0.5
        if any(k in q for k in ["audit", "log", "history", "who", "delete", "modified", "审计", "日志", "活动"]):
            cat = "activity_events"
            conf = 0.8
        elif any(k in q for k in ["gateway", "connect", "datasource", "网关", "连接", "数据源"]):
            cat = "gateways"
            conf = 0.8
        elif any(k in q for k in ["dataset", "model", "refresh", "dax", "模型", "刷新", "计算"]):
            cat = "datasets"
            conf = 0.8
        elif any(k in q for k in ["report", "visual", "export", "page", "报表", "导出"]):
            cat = "reports"
            conf = 0.8
        elif any(k in q for k in ["pipeline", "stage", "deploy", "管道", "部署"]):
            cat = "pipelines"
            conf = 0.8
        return {"category": cat, "title": cat.replace("_", " ").title(), "confidence": conf, "fallback": True}

    # =========================================================================
    # 场景 2: 报错信息快速归因分流与自愈建议 (Error Triage)
    # =========================================================================
    def triage_error(self, error_text: str) -> Dict[str, Any]:
        """Triage Power BI / DAX execution error into specific root cause category."""
        clean_err = error_text.strip()
        if not clean_err:
            return {"cause": "unknown", "confidence": 0.0, "fallback": True}

        if not self.is_available():
            return self._fallback_triage(clean_err)

        try:
            agent = self._get_agent()
            state = {"error_message": clean_err[:1000]}
            questions = {
                "cause": {
                    "type": "choice",
                    "instructions": "What is the primary technical cause of this execution failure?",
                    "criteria": {
                        "credential_expired": "datasource credentials, passwords, tokens or client secrets expired or invalid",
                        "gateway_unreachable": "on-premises gateway is offline, stopped, paused or unreachable over network",
                        "dax_syntax": "DAX query syntax error, invalid formula, missing column or measure reference",
                        "rls_blocked": "row-level security filtering restricted access to data or evaluation failed",
                        "rate_limited": "HTTP 429 Too Many Requests or capacity compute throttled by Fabric/Power BI",
                        "not_found": "requested workspace, artifact, report, model or dataset does not exist 404",
                    },
                }
            }

            res = agent.predict(state, questions)
            ans = res["answers"]["cause"]
            cause = str(ans.get("choice", "unknown"))
            confidence = float(ans.get("confidence", 0.0))
            probabilities = {k: round(float(v), 3) for k, v in ans.get("probabilities", {}).items()}

            advice_map = {
                "credential_expired": "数据源认证凭据已过期或无效。建议前往数据源连接配置刷新 OAuth Token 或重置密码凭据。",
                "gateway_unreachable": "本地数据网关 (On-Premises Gateway) 处于离线或网络不可达状态。请检查企业网关主机网络与服务运行状态。",
                "dax_syntax": "DAX 查询语句存在语法错误或引用了不存在的列/度量值。请检查表名与函数拼写。",
                "rls_blocked": "受模型 RLS(行级安全) 规则限制，当前账号未被分配对应角色或无权查看目标行数据。",
                "rate_limited": "触发了微软 API 调用频次阈值或容量算力限流 (429)。建议引入指数退避重试或降低并发。",
                "not_found": "请求的目标资产（工作区/语义模型/报表）不存在或已被删除。",
            }

            quick_fix_map = {
                "credential_expired": "update_credentials",
                "gateway_unreachable": "check_gateway_status",
                "dax_syntax": "format_dax",
                "rls_blocked": "inspect_rls_membership",
                "rate_limited": "exponential_backoff",
                "not_found": "rescan_workspaces",
            }

            return {
                "cause": cause,
                "root_cause": cause,
                "confidence": confidence,
                "probabilities": probabilities,
                "advice": advice_map.get(cause, "请查看详细错误日志进行人工排查。"),
                "resolution": advice_map.get(cause, "请查看详细错误日志进行人工排查。"),
                "quick_fix": quick_fix_map.get(cause, "inspect_log"),
                "fallback": False,
            }
        except Exception as e:
            logger.warning(f"Laya triage_error fallback due to: {e}")
            return self._fallback_triage(clean_err)

    def _fallback_triage(self, error_text: str) -> Dict[str, Any]:
        """Rule-based fallback for error triage."""
        e = error_text.lower()
        if any(k in e for k in ["credential", "oauth", "password", "dmts_datasourcenosuchconnection", "401", "403"]):
            adv = "数据源认证凭据已过期或未授权。建议更新数据源连接凭据。"
            return {
                "cause": "credential_expired",
                "root_cause": "credential_expired",
                "confidence": 0.85,
                "advice": adv,
                "resolution": adv,
                "quick_fix": "update_credentials",
                "fallback": True,
            }
        if any(k in e for k in ["gateway", "unreachable", "offline", "timeout", "网关"]):
            adv = "本地数据网关处于离线状态或无法连通。"
            return {
                "cause": "gateway_unreachable",
                "root_cause": "gateway_unreachable",
                "confidence": 0.85,
                "advice": adv,
                "resolution": adv,
                "quick_fix": "check_gateway_status",
                "fallback": True,
            }
        if any(k in e for k in ["syntax", "semanticanalysis", "dax", "query", "function"]):
            adv = "DAX 语法或度量值引用解析失败，请检查查询语句。"
            return {
                "cause": "dax_syntax",
                "root_cause": "dax_syntax",
                "confidence": 0.8,
                "advice": adv,
                "resolution": adv,
                "quick_fix": "format_dax",
                "fallback": True,
            }
        adv_gen = "请求执行遇到异常，建议检查控制台详细返回日志。"
        return {
            "cause": "general_error",
            "root_cause": "general_error",
            "confidence": 0.5,
            "advice": adv_gen,
            "resolution": adv_gen,
            "quick_fix": "inspect_log",
            "fallback": True,
        }

    # =========================================================================
    # 场景 3: 权限蓝图越权安全审计与合规哨兵 (Permission Guardrail)
    # =========================================================================
    def audit_permission_risk(
        self,
        role: str,
        user_title: str,
        workspace_type: str,
        permissions: List[str],
    ) -> Dict[str, Any]:
        """Evaluate privilege escalation or overpermission risks on canvas."""
        if not self.is_available():
            return self._fallback_audit(role, permissions)

        try:
            agent = self._get_agent()
            state = {
                "user_role": role,
                "user_title": user_title,
                "workspace_type": workspace_type,
                "active_permissions": ", ".join(permissions),
            }
            questions = {
                "is_overprivileged": {
                    "type": "noul",
                    "instructions": "Does this role and permission combination represent an excessive overprivileged security hazard?",
                },
                "risk_level": {
                    "type": "score",
                    "instructions": "Assess the security risk severity:",
                    "criteria": [
                        "benign / normal standard access",
                        "moderate review required",
                        "critical high-risk escalation violation",
                    ],
                },
            }

            res = agent.predict(state, questions)
            q_noul = res["answers"]["is_overprivileged"]
            q_score = res["answers"]["risk_level"]

            noul_prob = float(q_noul.get("noul", 0.0))
            score_val = float(q_score.get("score", 0.0))
            act_prob = float(q_noul.get("action", {}).get("act_probability", 1.0))
            probabilities = {k: round(float(v), 3) for k, v in q_score.get("probabilities", {}).items()}

            is_high_risk = noul_prob >= 0.5 or score_val >= 1.2
            advice = "该权限组合属于常规标准授权范畴。"
            if is_high_risk:
                advice = "⚠️ 警报：检测到高危越权赋权组合！该角色包含核心资产导出或删除权限，建议收紧至只读或提交安全复核。"
            elif score_val >= 0.7:
                advice = "ℹ️ 提示：该角色具备内容编辑权限，建议定期审计其使用痕迹。"

            return {
                "is_high_risk": is_high_risk,
                "risk_score": round(score_val, 2),
                "noul_probability": round(noul_prob, 3),
                "act_probability": round(act_prob, 2),
                "probabilities": probabilities,
                "advice": advice,
                "recommendation": advice,
                "fallback": False,
            }
        except Exception as e:
            logger.warning(f"Laya audit_permission_risk fallback due to: {e}")
            return self._fallback_audit(role, permissions)

    def _fallback_audit(self, role: str, permissions: List[str]) -> Dict[str, Any]:
        """Rule-based fallback for permission risk audit."""
        is_admin = "admin" in role.lower()
        has_delete = any("delete" in p.lower() for p in permissions)
        has_export = any("export" in p.lower() for p in permissions)

        is_high = is_admin and (has_delete or has_export)
        score = 1.8 if is_high else (0.8 if is_admin else 0.2)
        advice_str = "⚠️ 存在越权风险" if is_high else "权限分配在合理范畴。"
        return {
            "is_high_risk": is_high,
            "risk_score": score,
            "noul_probability": 0.85 if is_high else 0.15,
            "act_probability": 0.3 if is_high else 0.95,
            "probabilities": {"0": 0.1 if is_high else 0.8, "1": 0.2, "2": 0.7 if is_high else 0.0},
            "advice": advice_str,
            "recommendation": advice_str,
            "fallback": True,
        }
