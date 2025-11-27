import asyncio
import sqlite3

import asyncpg

from helpers.config import POSTGRES_DSN
from helpers.config import console  # usi già Rich nel progetto


SQLITE_PATH = "sql/databases/orders.db"  # aggiusta se il path è diverso


async def migrate():
    console.print("[bold]🔗 Connecting to Postgres...[/bold]")
    pg = await asyncpg.connect(POSTGRES_DSN)

    console.print("[bold]📁 Opening SQLite...[/bold]")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_cur = sqlite_conn.cursor()

    try:
        # 1) Pulisci le tabelle Postgres (così puoi rifare la migrazione se sbagli qualcosa)
        console.print("[yellow]⚠ Truncating Postgres tables...[/yellow]")
        await pg.execute("TRUNCATE TABLE order_notes, order_products, orders RESTART IDENTITY CASCADE")

        # ----------------------------------------
        # MIGRAZIONE ORDERS
        # ----------------------------------------
        console.print("[bold cyan]➡ Migrating orders...[/bold cyan]")

        sqlite_cur.execute("""
            SELECT
                "OrderID",
                "ClientName",
                "OrderPlatform",
                "TelegramTag",
                "CreateDate",
                "LastModifiedDate",
                "Status",
                "Notes"
            FROM orders
        """)
        order_rows = sqlite_cur.fetchall()

        orders_payload = [
            (
                row[0],  # OrderID  -> orders.id
                row[1],  # ClientName -> orders.name
                row[2],  # OrderPlatform -> orders.platform
                row[3],  # TelegramTag -> orders.customer_handle
                row[4],  # CreateDate -> orders.creation_date
                row[5],  # LastModifiedDate -> orders.last_modified
                row[6],  # Status -> orders.status
                row[7],  # Notes -> orders.notes
            )
            for row in order_rows
        ]

        if orders_payload:
            await pg.executemany(
                """
                INSERT INTO orders (
                    id,
                    name,
                    platform,
                    customer_handle,
                    creation_date,
                    last_modified,
                    status,
                    notes
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                """,
                orders_payload,
            )
        console.print(f"✅ Orders migrated: {len(orders_payload)}")

                # ----------------------------------------
        # MIGRAZIONE ORDER PRODUCTS
        # ----------------------------------------
        console.print("[bold cyan]➡ Migrating order products...[/bold cyan]")

        sqlite_cur.execute("""
            SELECT
                "id",
                "orderId",
                "ProductId",
                "Name",
                "Sku",
                "QuantityOrdered",
                "Price",
                "Position"
            FROM orderProduct
        """)
        prod_rows = sqlite_cur.fetchall()

        products_payload = []
        for row in prod_rows:
            position_raw = row[7]

            # prova a convertire la Position in int
            try:
                position_id = int(position_raw) if position_raw is not None else None
            except ValueError:
                # se dovessi avere valori non numerici, puoi decidere cosa fare:
                # - metti None
                # - metti 0
                # - logghi e salti la riga
                console.print(f"[yellow]⚠ Position non numerica '{position_raw}', uso 0[/yellow]")
                position_id = 0

            products_payload.append((
                row[0],                    # id -> order_products.id
                row[1],                    # orderId -> order_id
                row[2],                    # ProductId -> product_id
                row[3],                    # Name -> product_name
                row[4],                    # Sku -> sku
                row[5],                    # QuantityOrdered -> quantity
                float(row[6] or 0),        # Price -> price
                position_id,               # Position -> position_id (INT)
            ))

        if products_payload:
            await pg.executemany(
                """
                INSERT INTO order_products (
                    id,
                    order_id,
                    product_id,
                    product_name,
                    sku,
                    quantity,
                    price,
                    position_id
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                """,
                products_payload,
            )
        console.print(f"✅ Order products migrated: {len(products_payload)}")

            # ----------------------------------------
        # MIGRAZIONE ORDER NOTES
        # ----------------------------------------
        console.print("[bold cyan]➡ Migrating order notes...[/bold cyan]")

        sqlite_cur.execute("""
            SELECT
                "Id",
                "OrderId",
                "Note",
                "AddedAt",
                "AddedBy"
            FROM orderNotes
        """)
        note_rows = sqlite_cur.fetchall()

        notes_payload = [
            (
                row[0],              # Id -> order_notes.id
                row[1],              # OrderId -> order_id
                row[2],              # Note -> note
                str(row[3]),         # AddedAt -> created_at (TEXT)
                str(row[4]),         # AddedBy -> added_by (TEXT)
            )
            for row in note_rows
        ]

        if notes_payload:
            await pg.executemany(
                """
                INSERT INTO order_notes (
                    id,
                    order_id,
                    note,
                    created_at,
                    added_by
                )
                VALUES ($1,$2,$3,$4,$5)
                """,
                notes_payload,
            )
        console.print(f"✅ Order notes migrated: {len(notes_payload)}")

        # ----------------------------------------
        # SISTEMA LE SEQUENZE (SERIAL)
        # ----------------------------------------
        console.print("[bold]🔧 Fixing sequences...[/bold]")

        await pg.execute(
            "SELECT setval(pg_get_serial_sequence('orders','id'), COALESCE(MAX(id),0)) FROM orders"
        )
        await pg.execute(
            "SELECT setval(pg_get_serial_sequence('order_products','id'), COALESCE(MAX(id),0)) FROM order_products"
        )
        await pg.execute(
            "SELECT setval(pg_get_serial_sequence('order_notes','id'), COALESCE(MAX(id),0)) FROM order_notes"
        )

        console.print("[bold green]🎉 Migration completed successfully[/bold green]")

    finally:
        sqlite_conn.close()
        await pg.close()


if __name__ == "__main__":
    asyncio.run(migrate())