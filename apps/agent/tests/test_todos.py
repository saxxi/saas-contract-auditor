from src.todos import manage_todos, get_todos


def test_manage_todos_assigns_uuids(mock_tool_runtime):
    rt = mock_tool_runtime()
    todos = [
        {"id": "", "title": "Task 1", "description": "Do something", "emoji": "a", "status": "pending"},
        {"id": "", "title": "Task 2", "description": "Do more", "emoji": "b", "status": "pending"},
    ]
    result = manage_todos.invoke({"todos": todos, "runtime": rt})
    updated_todos = result.update["todos"]
    for todo in updated_todos:
        assert todo["id"] != ""
        assert len(todo["id"]) > 0


def test_manage_todos_preserves_existing_ids(mock_tool_runtime):
    rt = mock_tool_runtime()
    todos = [
        {"id": "existing-123", "title": "Task", "description": "x", "emoji": "a", "status": "pending"},
    ]
    result = manage_todos.invoke({"todos": todos, "runtime": rt})
    updated_todos = result.update["todos"]
    assert updated_todos[0]["id"] == "existing-123"


def test_get_todos_empty_state(mock_tool_runtime):
    rt = mock_tool_runtime(state={})
    result = get_todos.invoke({"runtime": rt})
    assert result == []
