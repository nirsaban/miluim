# מערכת יוגב – Project Context

This file contains persistent context for the Yogev operational system.

Claude should always read this file before generating new code or modifications.

Purpose:
Reduce token usage by storing project knowledge.

---

# Project Overview

System name:
מערכת יוגב – מערכת תפעול פלוגתית

Purpose:
Internal operational system for a reserve platoon.

Main capabilities:

• Soldier management
• Operational zones
• Task assignments
• Shift cycles
• Forms and requests
• Notifications
• Message board
• Food operations information
• Soldier social posts
• Admin operational dashboard

---

# Tech Stack

Frontend:
Next.js
TypeScript
TailwindCSS
RTL layout

Backend:
NestJS
TypeScript
Prisma ORM
PostgreSQL

Infrastructure:

Docker
Nginx
Hostinger VPS

Authentication:

Email + Password
Email OTP verification via Gmail API

---

# UI Language

All UI must be Hebrew.

RTL layout required.

Examples:

Login → התחברות
Register → הרשמה
Dashboard → לוח בקרה
Notifications → התראות
Forms → טפסים

---

# Core Modules

## Soldiers

Represents all platoon members.

Fields:

שם מלא
טלפון
אימייל
מספר אישי
תעודת זהות
תפקיד ראשי
Skills

---

## Skills

Soldiers can have multiple skills.

Examples:

מפקד
נהג
לוחם
ספוגיסט
חובש

Primary role must also exist as skill.

---

## Zones

Operational areas.

Examples:

טיילת
מעבר גבול
מלון דן

Zones contain tasks.

---

## Tasks

Each zone contains operational tasks.

Example:

Task: סיור

Requirements:

מפקד (1)
נהג (1)
לוחם (2)

---

## Shift Cycles

System supports 24 hour operational cycles.

Examples:

06:00 – 18:00
18:00 – 06:00

or

3 shift cycles.

Each shift must fill all tasks.

---

## Scheduling

Admin assigns soldiers to task slots.

Assignment rules:

• Soldier cannot work two shifts same day
• Soldier cannot work night followed by morning
• Soldier cannot work more than 3 consecutive nights
• Soldier must have required skill

---

## Forms

System includes operational forms:

בקשת יציאה קצרה
דיווח חוסר בציוד
בקשת יציאה הביתה
הצעות לשיפור
המלצת מסעדה

---

## Notifications

Notifications shown on dashboard.

Examples:

פורסם סידור משמרות חדש
בקשה אושרה
בקשה נדחתה

---

# Deployment

System runs on VPS.

Architecture:

Nginx
Frontend container
Backend container
PostgreSQL container

---

# UI Structure

Main pages:

/login
/register
/dashboard

Admin:

/admin/soldiers
/admin/zones
/admin/tasks
/admin/schedule

---

# Drag & Drop Scheduling

Admin UI includes drag and drop soldier assignment.

Soldiers list shows:

name
skills
last shift
night count

Shift board shows:

tasks
required roles
assignment slots

---

# Future Features

AI scheduler
Workload balancing
Push notifications
PWA support
WhatsApp notifications

---

# Instructions for Claude

When generating code:

1. Respect existing architecture
2. Extend modules rather than replacing them
3. Maintain Hebrew RTL UI
4. Follow NestJS modular structure
5. Keep backend services separated
6. Avoid breaking current functionality

---

# End of Context