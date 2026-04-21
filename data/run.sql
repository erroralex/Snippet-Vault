PRAGMA foreign_keys = OFF;

CREATE TABLE snippet_new AS SELECT * FROM snippet;
DROP TABLE snippet;

CREATE TABLE snippet (
    id           TEXT    NOT NULL PRIMARY KEY,
    title        TEXT    NOT NULL,
    language     TEXT    NOT NULL,
    content      TEXT,
    file_path    TEXT,            -- nullable now
    description  TEXT,
    last_modified TEXT,
    favorite     INTEGER NOT NULL DEFAULT 0,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    color_label  TEXT,
    folder_id    TEXT,
    template     INTEGER NOT NULL DEFAULT 0,
    ai_summary   TEXT
);

INSERT INTO snippet SELECT * FROM snippet_new;
DROP TABLE snippet_new;

PRAGMA foreign_keys = ON;