-- Run this in phpMyAdmin (SQL tab) ONLY if your existing database already
-- has the old sample promotions whose dates have expired.
-- It makes the sample promotions active again for the next 90 days.

USE localbiz;

UPDATE promotions
SET start_date = CURDATE(),
    end_date   = DATE_ADD(CURDATE(), INTERVAL 90 DAY);
