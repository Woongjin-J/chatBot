-- SQL to create a table of calendar events containing columns Date, Time,
-- and Event

USE calEventdb

CREATE TABLE calEvent(
  date VARCHAR(255) NOT NULL,
  time VARCHAR(255) NOT NULL,
  event VARCHAR(255) NOT NULL,
  PRIMARY KEY(date)
);
