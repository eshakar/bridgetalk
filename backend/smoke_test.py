"""In-process smoke test against whatever MongoDB is configured (or none).

Run from backend/: python smoke_test.py
- MongoDB reachable: checks persistence end to end on the real database.
- MongoDB unreachable: checks the fallback mode (sample served, writes refused with 503).
"""

from fastapi.testclient import TestClient

from app.main import app


def check_stateless(client: TestClient, meeting: dict) -> None:
    inline = {"title": meeting["title"], "speakers": meeting["speakers"], "segments": meeting["segments"]}
    analysis = client.post("/api/meetings/analyze", json=inline).json()
    assert analysis["persisted"] is False and len(analysis["decisions"]) >= 2
    items = {item["task"]: item for item in analysis["action_items"]}
    assert items["Fix the two payment bugs"]["owner"] == "Rahul Banerjee"
    assert items["Fix the two payment bugs"]["deadline"] == "Friday"
    assert any(item["owner"] is None for item in analysis["action_items"])
    assert analysis["open_questions"]

    missing = client.post("/api/meetings/ask", json={**inline, "question": "What is the marketing budget?"}).json()
    assert not missing["grounded"] and "does not provide enough information" in missing["answer"]

    invalid = client.post("/api/meetings/ask", json={"question": "hello"})
    assert invalid.status_code == 422 and invalid.json()["error"] == "invalid_request"
    bad_id = client.get("/api/meetings/not-an-object-id")
    assert bad_id.status_code == 422 and bad_id.json()["error"] == "invalid_id"


def check_fallback(client: TestClient, meeting: dict) -> None:
    assert meeting["persisted"] is False and meeting["id"] == "lumen-beta-sync"
    for response in (
        client.get("/api/meetings"),
        client.get("/api/meetings/000000000000000000000000"),
        client.post("/api/meetings/analyze", json={"meeting_id": "000000000000000000000000"}),
        client.patch("/api/meetings/000000000000000000000000/action-items/a1", json={"status": "done"}),
    ):
        assert response.status_code == 503, response.status_code
        assert response.json()["error"] == "database_unavailable"
    assert client.post("/api/meetings/demo/reset").json()["persisted"] is False


def check_persistence(client: TestClient, meeting: dict) -> None:
    meeting_id = meeting["id"]
    assert meeting["persisted"] is True and len(meeting["segments"]) == 11
    analysis = client.post("/api/meetings/analyze", json={"meeting_id": meeting_id}).json()
    assert analysis["persisted"] is True
    item_id = analysis["action_items"][0]["id"]
    patched = client.patch(f"/api/meetings/{meeting_id}/action-items/{item_id}", json={"status": "done"})
    assert patched.status_code == 200 and patched.json()["status"] == "done"
    answer = client.post("/api/meetings/ask", json={"meeting_id": meeting_id, "question": "Who is fixing the payment bugs?"}).json()
    assert answer["persisted"] and answer["grounded"]
    detail = client.get(f"/api/meetings/{meeting_id}").json()
    assert detail["insights"]["action_items"][0]["status"] == "done" and detail["questions"]
    assert client.get("/api/meetings/000000000000000000000000").status_code == 404
    assert client.patch(f"/api/meetings/{meeting_id}/action-items/zz", json={"status": "done"}).status_code == 404
    reset = client.post("/api/meetings/demo/reset").json()
    assert reset["insights"] is None and reset["questions"] == []


def main() -> None:
    with TestClient(app) as client:
        health = client.get("/health").json()
        meeting = client.get("/api/meetings/demo").json()
        check_stateless(client, meeting)
        if health["database"] == "connected":
            check_persistence(client, meeting)
        else:
            check_fallback(client, meeting)
        print(f"Smoke test passed (database: {health['database']}, health: {health['status']}).")


if __name__ == "__main__":
    main()
