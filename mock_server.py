import logging
import asyncio
from typing import Dict, Any, List

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn

# 기본 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Open-Cowork Mock Proxy Server")

@app.get("/v1/models")
async def get_models() -> JSONResponse:
    """
    Diagnostics(진단) 모듈 통과를 위한 모델 리스트 반환
    """
    logger.info("GET /v1/models requested.")
    try:
        return JSONResponse(content={
            "object": "list",
            "data": [{"id": "mock-model", "object": "model", "created": 1234567890, "owned_by": "mock"}]
        })
    except Exception as e:
        logger.error(f"Failed to return models: {e}")
        return JSONResponse(status_code=500, content={"error": "Internal Server Error"})

@app.post("/v1/chat/completions")
async def chat_completions(req: Request):
    """
    채팅 요청 시 스트리밍(또는 일반) 가짜 응답 반환
    실패 시나리오: JSON 파싱 에러 또는 클라이언트 연결 끊김 시 예외 발생 가능
    """
    try:
        body: Dict[str, Any] = await req.json()
        stream: bool = body.get("stream", False)
        logger.info(f"POST /v1/chat/completions requested. Stream: {stream}")

        if stream:
            async def event_generator():
                try:
                    # 스트리밍 청크 전송 시뮬레이션
                    chunks: List[str] = [
                        "🛠️ ", "[Mock ", "Proxy ", "Server] ", "요청이 ", 
                        "성공적으로 ", "도달했습니다. ", "이 응답은 ", "과금되지 ", "않습니다."
                    ]
                    for chunk in chunks:
                        yield f'data: {{"id":"mock123","choices":[{{"delta":{{"content":"{chunk}"}}}}]}}\n\n'
                        await asyncio.sleep(0.1)  # 네트워킹 지연 시뮬레이션
                    
                    yield 'data: [DONE]\n\n'
                except asyncio.CancelledError:
                    logger.warning("Streaming cancelled by client.")
                except Exception as e:
                    logger.error(f"Streaming error: {e}")
                    yield f'data: {{"error":"{str(e)}"}}\n\n'

            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            return JSONResponse(content={
                "id": "chatcmpl-mock123",
                "object": "chat.completion",
                "created": 1677652288,
                "model": "mock-model",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "🛠️ [Mock Proxy Server] 요청이 성공적으로 도달했습니다. 이 응답은 과금되지 않습니다."
                    },
                    "finish_reason": "stop"
                }],
                "usage": {"prompt_tokens": 9, "completion_tokens": 12, "total_tokens": 21}
            })

    except Exception as e:
        logger.error(f"Failed to process chat completions: {e}")
        return JSONResponse(status_code=400, content={"error": f"Bad Request: {str(e)}"})

if __name__ == "__main__":
    logger.info("Starting Open-Cowork Mock Proxy Server on port 8080...")
    # uvicorn 환경에서 실행 (포트 8080)
    uvicorn.run(app, host="127.0.0.1", port=8080)
