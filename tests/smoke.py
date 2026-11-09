"""以標準函式庫檢查真實 Java HTTP API；先啟動伺服器再執行。"""
import json
from pathlib import Path
import sys
import urllib.request
import urllib.parse
import urllib.error

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"


def request(path, data=None, expected=200):
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    req = urllib.request.Request(BASE + path, data=body)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            assert response.status == expected, response.status
            return json.load(response)
    except urllib.error.HTTPError as error:
        assert error.code == expected, (error.code, error.read().decode())
        return json.load(error)


for asset in ["/", "/app.js", "/style.css"]:
    with urllib.request.urlopen(BASE + asset) as response:
        assert response.status == 200
        assert len(response.read()) > 100

# 正解僅從本機原始碼讀取，確認 API 不洩漏答案。
source = (Path(__file__).resolve().parents[1] / "src/Main.java").read_text()
bank = source.split('String bank = """', 1)[1].split('""";', 1)[0].strip().splitlines()
answers = {f"q{i}": int(line.split("|")[4]) for i, line in enumerate(bank)}
assert len(answers) == 38
exam = request("/api/exam")["questions"]
assert len(exam) == 18
assert len({q["id"] for q in exam}) == 18
assert all("answer" not in q and "explanation" not in q for q in exam)
assert all(sum(q["subject"] == subject for q in exam) == 3 for subject in ["國文", "英文", "數學", "自然", "社會", "常識"])
essay = "我希望在高中完成自己的作品，因為我喜歡觀察生活，所以想把想法變成實際成果。例如我曾經和朋友設計海報，學會了分工，也發現自己還需要練習表達。未來我希望規劃固定的練習時間，記錄遇到的困難，並且勇敢向老師與同學請教，逐步完成一件能分享給大家的作品。"
data = {"ids": ",".join(q["id"] for q in exam), "answers": ",".join(str(answers[q["id"]]) for q in exam), "essay": essay}
perfect = request("/api/grade", data)
assert perfect["total"] == 36, perfect
assert perfect["writing"] == 6
assert all(s["level"] == "A++" for s in perfect["scores"])
wrong = dict(data, answers=",".join(str((answers[q["id"]] + 1) % 4) for q in exam))
lowest = request("/api/grade", wrong)
assert lowest["total"] == 6
assert all(s["level"] == "C" for s in lowest["scores"])
request("/api/grade", dict(data, essay="太短"), 400)
request("/api/grade", dict(data, ids=",".join([exam[0]["id"]] * 18)), 400)
request("/api/grade", dict(data, answers=",".join(["0.5"] * 18)), 400)
request("/api/grade", dict(data, essay="字" * 301), 400)
admission = dict(route="apply", exam=90, portfolio=80, confidence=80, talent=80, threshold=70, rank=10, maxRank=20)
assert request("/api/admission", admission)["accepted"]
assert not request("/api/admission", dict(admission, route="star", rank=30))["accepted"]
assert not request("/api/admission", dict(admission, exam=20))["accepted"]
assert request("/api/admission", dict(admission, route="distribution", exam=71))["accepted"]
assert not request("/api/admission", dict(admission, route="distribution", exam=69))["accepted"]
request("/api/admission", dict(admission, exam="NaN"), 400)
request("/api/admission", dict(admission, route="unknown"), 400)
print("PASS：靜態資源、隨機抽題、滿分／最低分批改、輸入驗證、三種管道錄取判定。")
