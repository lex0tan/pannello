from functools import wraps
from fastapi.responses import JSONResponse
from pydantic import ValidationError
import traceback
from helpers.config import console

def standard_error_handler(context: str):
    """
    Wrapper per gestire in modo uniforme ValidationError e Exception generiche
    negli endpoint degli ordini.
    `context` serve solo per loggare e costruire il messaggio di errore.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)

            except ValidationError as ve:
                console.print(f"Errore di validazione durante {context}",style="bold red")
                for err in ve.errors():
                    console.print(f"Errore nella validazione di '{err['loc'][0]}', "f"valore ricevuto: {err['input']}\n {err['msg'].strip()}",style="red")

                return JSONResponse(status_code=422,content={"success": False,"data": None,"error": f"Errore nella struttura dei dati ({context})",},)

            except Exception:
                console.print(f"Errore sconosciuto durante {context}", style="bold red")
                console.print(traceback.format_exc(), style="red")

                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "data": None,
                        "error": f"Errore interno durante {context}",
                    },
                )

        return wrapper
    return decorator