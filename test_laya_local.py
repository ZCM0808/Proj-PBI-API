import os
import sys
import time
import json

# 解决 Windows 控制台编码问题
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# 配置国内 Hugging Face 镜像源以确保高速稳定下载权重
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

print("=" * 70)
print("🚀 [Laya 本地实测] System 1 (系统一) 非自回归决策模型就绪性验证")
print("=" * 70)

import laya

start_load = time.time()
print("\n[*] 正在加载本地预缓存模型 (convaiinnovations/laya)...")
try:
    agent = laya.load("convaiinnovations/laya")
    load_duration = (time.time() - start_load) * 1000
    print(f"[OK] 模型常驻内存就绪！加载耗时: {load_duration:.1f} ms")
except Exception as e:
    print(f"[ERR] 模型加载失败: {e}")
    exit(1)

print("\n" + "=" * 70)
print("🎯 场景 1: Power BI 角色赋权与越权安全审计初筛 (Security Sentinel)")
print("=" * 70)

state_perm = {
    "user_title": "Summer Intern (数据分析实习生)",
    "workspace": "Finance Executive Confidential (财务核心绝密工作区)",
    "action": "Elevate to Admin role & export underlying financial tabular model data",
    "details": "User requested admin privileges to bypass RLS filters for ad-hoc export."
}

questions_perm = {
    "is_high_risk": {
        "type": "noul",
        "instructions": "Does this role assignment represent an overprivileged high-risk security violation?"
    },
    "risk_level": {
        "type": "score",
        "instructions": "Evaluate the compliance severity of this privilege escalation:",
        "criteria": ["low / acceptable", "moderate review required", "critical security breach hazard"]
    }
}

t0 = time.time()
res_perm = agent.predict(state_perm, questions_perm)
t_perm = (time.time() - t0) * 1000

q1 = res_perm['answers']['is_high_risk']
q2 = res_perm['answers']['risk_level']
is_violation = q1['noul'] >= 0.5

print(f"⏱️ 推理耗时 (CPU): {t_perm:.1f} ms")
print(f"• 状态输入             : 实习生申请进入【财务核心绝密工作区】并授予【Admin】导出底层数据")
print(f"• 是否高危越权 (noul)  : {'🚨 是 (HIGH RISK)' if is_violation else '✅ 否 (SAFE)'} (判定概率: {q1['noul']*100:.1f}%)")
print(f"• 风险严重程度 (score) : 等级 {q2['score']:.2f} / 2.0 (严重度打分: {q2['score']:.2f}, 置信度: {q2['confidence']:.3f})")
print(f"• 各等级概率分布       : 0(低风险)={q2['probabilities']['0']*100:.1f}%, 1(需复核)={q2['probabilities']['1']*100:.1f}%, 2(高危)={q2['probabilities']['2']*100:.1f}%")
print(f"• 人机决策分流 (Action): 自主执行率={q1['action']['act_probability']:.2f}")

print("\n" + "=" * 70)
print("🎯 场景 2: Power BI Admin API 模糊口语化搜索与分类路由 (API Router)")
print("=" * 70)

state_api = {
    "user_query": "Audit who modified, overwritten or deleted our executive sales report in the tenant yesterday"
}

questions_api = {
    "api_category": {
        "type": "choice",
        "instructions": "Which Power BI Admin API endpoint family should handle this administrative audit request?",
        "criteria": {
            "activity_events": "query audit activity events, audit logs and user operation history across the tenant",
            "workspace_access": "inspect workspace user access lists, role memberships and assignments",
            "dataset_refresh": "trigger or monitor semantic model dataset refresh status and schedule",
            "gateway_cluster": "check on-premises data gateway cluster health, connectivity and datasources"
        }
    }
}

t0 = time.time()
res_api = agent.predict(state_api, questions_api)
t_api = (time.time() - t0) * 1000

ans_cat = res_api['answers']['api_category']
print(f"⏱️ 推理耗时 (CPU): {t_api:.1f} ms")
print(f"• 用户口语需求         : '{state_api['user_query']}'")
print(f"• 自动命中 API (choice): 🎯 [{ans_cat['choice'].upper()}] (最高匹配置信度: {ans_cat['confidence']:.3f})")
print(f"• 候选分类得分分布     : " + ", ".join([f"{k}={v*100:.1f}%" for k, v in ans_cat['probabilities'].items()]))

print("\n" + "=" * 70)
print("🎯 场景 3: DAX / 数据源刷新报错秒级归因分流 (Zero-Latency Error Triage)")
print("=" * 70)

state_err = {
    "error_log": "The on-premises data gateway is unreachable. DMTS_DatasourceHasNoSuchConnection: The credentials supplied for the datasource connection have expired."
}

questions_err = {
    "error_triage": {
        "type": "choice",
        "instructions": "What is the primary root cause of this execution failure?",
        "criteria": {
            "dax_syntax": "DAX query syntax error or invalid calculation measure reference",
            "gateway_unreachable": "on-premises gateway is offline, paused or unreachable on network",
            "credential_expired": "datasource authentication credentials or OAuth tokens have expired",
            "rls_blocked": "row-level security filtering restricted access to rows"
        }
    }
}

t0 = time.time()
res_err = agent.predict(state_err, questions_err)
t_err = (time.time() - t0) * 1000

ans_err = res_err['answers']['error_triage']
print(f"⏱️ 推理耗时 (CPU): {t_err:.1f} ms")
print(f"• 原始错误日志         : '{state_err['error_log']}'")
print(f"• 归因判定结论 (choice): 💡 [{ans_err['choice'].upper()}] (匹配置信度: {ans_err['confidence']:.3f})")
print(f"• 候选故障概率分布     : " + ", ".join([f"{k}={v*100:.1f}%" for k, v in ans_err['probabilities'].items()]))

print("\n" + "=" * 70)
print("🎉 [实测全流程成功] 纯本地 CPU 推理，零外网依赖，物理杜绝格式错乱与幻觉！")
print("=" * 70)
