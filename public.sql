/*
 Navicat Premium Data Transfer

 Source Server         : 1111
 Source Server Type    : PostgreSQL
 Source Server Version : 180001 (180001)
 Source Host           : localhost:5432
 Source Catalog        : ownenglish
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 180001 (180001)
 File Encoding         : 65001

 Date: 02/04/2026 16:07:55
*/


-- ----------------------------
-- Type structure for activitytype
-- ----------------------------
DROP TYPE IF EXISTS "public"."activitytype";
CREATE TYPE "public"."activitytype" AS ENUM (
  'CREATE_TASK_GROUP',
  'PUBLISH_TASK',
  'SHARE_TASK',
  'CREATE_CLASS',
  'CREATE_STUDY_PACK',
  'STUDENT_JOIN_CLASS'
);
ALTER TYPE "public"."activitytype" OWNER TO "postgres";

-- ----------------------------
-- Type structure for notificationtype
-- ----------------------------
DROP TYPE IF EXISTS "public"."notificationtype";
CREATE TYPE "public"."notificationtype" AS ENUM (
  'SYSTEM',
  'CLASS_ANNOUNCEMENT',
  'STUDY_PACK_ASSIGNED',
  'STUDY_PACK_DUE',
  'LIVE_SESSION_STARTED',
  'SUBMISSION_GRADED',
  'NEW_STUDENT_JOINED',
  'SHARE_IMPORTED'
);
ALTER TYPE "public"."notificationtype" OWNER TO "postgres";

-- ----------------------------
-- Type structure for userrole
-- ----------------------------
DROP TYPE IF EXISTS "public"."userrole";
CREATE TYPE "public"."userrole" AS ENUM (
  'TEACHER',
  'STUDENT',
  'admin'
);
ALTER TYPE "public"."userrole" OWNER TO "postgres";

-- ----------------------------
-- Table structure for activity_logs
-- ----------------------------
DROP TABLE IF EXISTS "public"."activity_logs";
CREATE TABLE "public"."activity_logs" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "type" "public"."activitytype" NOT NULL,
  "description" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "entity_type" varchar(50) COLLATE "pg_catalog"."default",
  "entity_id" varchar(36) COLLATE "pg_catalog"."default",
  "extra_data" json,
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of activity_logs
-- ----------------------------
INSERT INTO "public"."activity_logs" VALUES ('87c1d692-2cd2-4853-9342-b651c24cf963', 'a9906d17-dfb2-40d0-9642-ef25ed0be1e0', 'CREATE_TASK_GROUP', '创建课前准备：Regression Task Group 1', 'task_group', 'afe25f9e-7914-42eb-904f-ad9ee426e604', '{"class_id": "b53fd8f0-9cc7-4d25-a70c-30898db11006", "status": "draft"}', '2026-03-27 20:01:58.848521+08');
INSERT INTO "public"."activity_logs" VALUES ('aca0e97d-c033-4795-be2f-be5eaeae654e', 'a9906d17-dfb2-40d0-9642-ef25ed0be1e0', 'PUBLISH_TASK', '发布任务：Regression Task Group 1', 'task_group', 'afe25f9e-7914-42eb-904f-ad9ee426e604', '{"old_status": "draft", "new_status": "ready"}', '2026-03-27 20:02:33.247371+08');
INSERT INTO "public"."activity_logs" VALUES ('5f425a90-a2df-4c85-9884-cb26f7c5a835', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：Unit1', 'task_group', '2cdb4ca5-e265-4fb9-98a4-df5c29f8000e', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-27 23:30:39.553029+08');
INSERT INTO "public"."activity_logs" VALUES ('5744401e-45c0-4308-8e33-c07dd84ae351', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "ended", "new_status": "ready"}', '2026-03-27 23:33:59.361866+08');
INSERT INTO "public"."activity_logs" VALUES ('9b036439-3b30-4046-96b3-7739e3ad91f5', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "ended", "new_status": "ready"}', '2026-03-27 23:48:20.040035+08');
INSERT INTO "public"."activity_logs" VALUES ('02f663a2-2686-438f-98a8-ddaba5edf678', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "ended", "new_status": "ready"}', '2026-03-27 23:50:14.215161+08');
INSERT INTO "public"."activity_logs" VALUES ('f9453ebd-f16d-463a-bc92-1e5bf62eab68', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "ended", "new_status": "ready"}', '2026-03-28 00:05:29.533038+08');
INSERT INTO "public"."activity_logs" VALUES ('e573a85d-7c63-4d13-88b1-faf8b777b0a5', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：U2', 'task_group', 'b78870bf-7992-4194-a61b-e3dd1cfa63b2', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-28 14:01:36.24942+08');
INSERT INTO "public"."activity_logs" VALUES ('d0c706c8-0751-4850-a691-480dc75a7bc2', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：ttt', 'task_group', 'd9fe2771-b56d-40ad-ad16-78e304ec0d66', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-28 14:02:52.461285+08');
INSERT INTO "public"."activity_logs" VALUES ('ca5dc7ea-8f25-45bf-969c-442d1ee5f315', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-29 22:43:30.079044+08');
INSERT INTO "public"."activity_logs" VALUES ('b700dc5d-3c08-4587-99ab-ae7a674e3c7c', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-29 22:44:15.413349+08');
INSERT INTO "public"."activity_logs" VALUES ('e1de4448-91dd-4e3f-8ad8-d14214dc3078', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 08:30:42.767778+08');
INSERT INTO "public"."activity_logs" VALUES ('87e61c54-1126-4166-beeb-8cd044c0c826', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 08:31:47.197197+08');
INSERT INTO "public"."activity_logs" VALUES ('eb0a8e50-6930-452b-bb3d-2f97762c4a17', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 08:32:22.45866+08');
INSERT INTO "public"."activity_logs" VALUES ('16e193d1-88a5-40f8-b99d-6ba1639f9f44', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "ended", "new_status": "ready"}', '2026-03-30 08:33:27.039641+08');
INSERT INTO "public"."activity_logs" VALUES ('55100320-8979-4e94-84a1-b866ac542b85', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 08:34:02.019749+08');
INSERT INTO "public"."activity_logs" VALUES ('a465404c-dd82-49c5-88e9-98599d463094', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 09:51:09.770583+08');
INSERT INTO "public"."activity_logs" VALUES ('e722c7bb-26cf-4ff5-8bc4-fb72d08ff833', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 10:19:21.224969+08');
INSERT INTO "public"."activity_logs" VALUES ('e69a804f-1b33-4bed-920f-f138bf9acf6e', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 11:16:59.090968+08');
INSERT INTO "public"."activity_logs" VALUES ('5eec0515-0479-4a53-9488-938aa1cc6a10', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 11:44:41.958354+08');
INSERT INTO "public"."activity_logs" VALUES ('ed7fb6cf-9cff-428c-8c32-e01f4da40f2b', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 11:50:37.248776+08');
INSERT INTO "public"."activity_logs" VALUES ('dd9f3a2c-836e-4d76-a353-2d2fabe61372', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 12:01:31.056003+08');
INSERT INTO "public"."activity_logs" VALUES ('b09504ab-df8c-4d4d-beb8-63ed85c19ec0', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 12:20:59.524123+08');
INSERT INTO "public"."activity_logs" VALUES ('b445ae28-2de3-4819-9273-c174fe0ec5e7', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 13:47:42.713858+08');
INSERT INTO "public"."activity_logs" VALUES ('2918b5ef-c0ea-4242-8b40-788cb4acc7ed', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 13:47:46.0599+08');
INSERT INTO "public"."activity_logs" VALUES ('011d35d5-49d3-4465-89c5-2a6a427b1e47', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：科技改变世界', 'task_group', '90129886-5c1f-4c12-997e-c75c17d89995', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-30 13:51:49.109057+08');
INSERT INTO "public"."activity_logs" VALUES ('a86fe944-8eca-4b98-bbc6-88967c322471', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：科技改变世界', 'task_group', '90129886-5c1f-4c12-997e-c75c17d89995', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 13:52:29.824413+08');
INSERT INTO "public"."activity_logs" VALUES ('251673db-cdd3-4cab-b607-23f3a9c59d51', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：科技改变世界', 'task_group', '90129886-5c1f-4c12-997e-c75c17d89995', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 13:57:23.93709+08');
INSERT INTO "public"."activity_logs" VALUES ('b508ee41-e85b-43d1-9a1b-3a493e3c4fb5', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 13:58:29.8208+08');
INSERT INTO "public"."activity_logs" VALUES ('15b9e536-e019-4dd7-96a3-be4f72abf69f', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:19:51.110357+08');
INSERT INTO "public"."activity_logs" VALUES ('89e1a91a-d089-46f8-96b2-a23b4c8da379', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:19:56.52755+08');
INSERT INTO "public"."activity_logs" VALUES ('c6dd184f-6ab8-40dd-bf62-424599e6da13', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:21:57.77837+08');
INSERT INTO "public"."activity_logs" VALUES ('d4e21d4e-576b-4a5f-a838-0269feb4ca05', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:24:24.304252+08');
INSERT INTO "public"."activity_logs" VALUES ('91665a07-ea0b-475b-96a3-f9727c1b0864', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:27:34.092237+08');
INSERT INTO "public"."activity_logs" VALUES ('edb92fa9-7b5a-4512-95d2-6521b9fb7a03', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:36:58.057676+08');
INSERT INTO "public"."activity_logs" VALUES ('4e91adab-8519-476f-bbba-e402e96e2736', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:37:27.723318+08');
INSERT INTO "public"."activity_logs" VALUES ('9e2046af-01d2-4b14-a2bb-894c1ef52500', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:50:20.296438+08');
INSERT INTO "public"."activity_logs" VALUES ('5aa7ff0f-c6a3-4082-8b73-0f764fcdbdca', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 14:52:25.370273+08');
INSERT INTO "public"."activity_logs" VALUES ('ba4373a4-0e46-4c46-b32a-6e576b410305', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 15:10:32.840744+08');
INSERT INTO "public"."activity_logs" VALUES ('d0313956-7897-430d-9e28-406ceb55232e', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 15:23:01.72825+08');
INSERT INTO "public"."activity_logs" VALUES ('e9be0674-7765-4d82-a2b3-4818520149a7', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 15:24:14.49024+08');
INSERT INTO "public"."activity_logs" VALUES ('7c27d498-6a38-4bc6-895f-9d55439a0a77', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 16:27:10.60108+08');
INSERT INTO "public"."activity_logs" VALUES ('756e0a9f-8a1c-47b0-a86e-7eec802acc72', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 16:41:32.502561+08');
INSERT INTO "public"."activity_logs" VALUES ('fef5e781-371a-4bf4-a0a6-66635b0f9257', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 17:23:54.445657+08');
INSERT INTO "public"."activity_logs" VALUES ('0fd1d683-4fcf-4185-9655-4f5fd0a37c0d', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 17:41:24.224071+08');
INSERT INTO "public"."activity_logs" VALUES ('cd2c8a1b-f375-411e-8f32-8b56071314f9', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 18:00:51.934827+08');
INSERT INTO "public"."activity_logs" VALUES ('59cabdc9-41b3-4b56-aca0-3c7cb9cfd551', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 18:19:52.718298+08');
INSERT INTO "public"."activity_logs" VALUES ('2efaee47-9c01-41d9-9dec-66bdee0836dd', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 18:23:45.453707+08');
INSERT INTO "public"."activity_logs" VALUES ('9d2beeee-3aef-4f23-beb0-0d62f501d5b7', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 19:15:02.355106+08');
INSERT INTO "public"."activity_logs" VALUES ('3ca40ef7-f16f-4c6d-b48c-2c6405853795', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：实验课', 'task_group', 'd7e528fe-30de-428c-a005-019561a091b6', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-30 21:54:46.693479+08');
INSERT INTO "public"."activity_logs" VALUES ('600e1a32-e7a6-4029-8e8f-08e502951d20', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-30 23:42:50.246232+08');
INSERT INTO "public"."activity_logs" VALUES ('f137d0cb-6d25-4a4c-acab-bb5ab322dd21', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 23:43:33.459588+08');
INSERT INTO "public"."activity_logs" VALUES ('3f2ba7d3-d75d-45ea-8f17-763d60d0dc95', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-30 23:53:04.170773+08');
INSERT INTO "public"."activity_logs" VALUES ('352f5a3b-6fb1-4e5f-aea8-0989ae95bc19', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 00:10:43.118735+08');
INSERT INTO "public"."activity_logs" VALUES ('e37489d0-86ed-41f0-ac17-9ec8390db144', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 00:22:30.298303+08');
INSERT INTO "public"."activity_logs" VALUES ('e25a9ae5-0243-4701-80e9-52f9ec7c7914', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:27:57.874772+08');
INSERT INTO "public"."activity_logs" VALUES ('91cb9996-1213-4d19-9e17-ea03877ffb06', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:33:43.593255+08');
INSERT INTO "public"."activity_logs" VALUES ('c43af1a3-0c81-4731-8de1-f72c45d8c1e5', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:40:24.179348+08');
INSERT INTO "public"."activity_logs" VALUES ('7684fcae-e7cb-4fe7-b0ab-8ffe81b41eab', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:40:52.734038+08');
INSERT INTO "public"."activity_logs" VALUES ('bf7bd833-14cc-4404-a069-a24dbf36ac25', '794482be-bd9c-43d2-9c66-91e7a6773472', 'CREATE_TASK_GROUP', '创建课前准备：ttt', 'task_group', 'c7e9b70b-02a8-4bd2-ad2a-7e5c0625cf1d', '{"class_id": "d0b18231-bb66-4481-8ddd-e3088a1d25d6", "status": "draft"}', '2026-03-31 08:42:30.605624+08');
INSERT INTO "public"."activity_logs" VALUES ('319a2f90-ff68-4279-bfff-86b38711deda', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:44:39.701603+08');
INSERT INTO "public"."activity_logs" VALUES ('d6c05334-bac3-426b-9c25-3420accdc4a5', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:45:52.015845+08');
INSERT INTO "public"."activity_logs" VALUES ('f10ed574-6f1a-49e3-9f9b-9ccd0355fc32', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:48:47.397773+08');
INSERT INTO "public"."activity_logs" VALUES ('77024cdd-69df-4ca1-a805-e4782b194bf6', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 08:57:13.820129+08');
INSERT INTO "public"."activity_logs" VALUES ('f38184c2-0fc7-44ff-9ce7-b4dd4f2a28ab', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:03:40.43991+08');
INSERT INTO "public"."activity_logs" VALUES ('e4ab2c32-b0af-4d07-8243-a00866187c4b', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:05:43.547767+08');
INSERT INTO "public"."activity_logs" VALUES ('8ce0489f-2443-4f9f-9ea4-e43380b61f25', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:09:34.885224+08');
INSERT INTO "public"."activity_logs" VALUES ('1fe08515-aefe-4b99-8372-ea73d81f3a93', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:25:14.568752+08');
INSERT INTO "public"."activity_logs" VALUES ('d41b3a57-96ed-4bb0-890b-f7097467c55d', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:25:20.776245+08');
INSERT INTO "public"."activity_logs" VALUES ('8be29390-2a1b-4152-b032-ead1c823cc95', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:27:01.00391+08');
INSERT INTO "public"."activity_logs" VALUES ('1b986e1d-f6b7-4e78-af3e-b54a0699695a', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 09:27:45.017164+08');
INSERT INTO "public"."activity_logs" VALUES ('0115f64b-a32a-438b-892e-9189944bb788', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 10:33:10.2764+08');
INSERT INTO "public"."activity_logs" VALUES ('aff280aa-d9c7-4b16-a07d-14e4c898c94e', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ttt', 'task_group', 'c7e9b70b-02a8-4bd2-ad2a-7e5c0625cf1d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 11:38:29.411113+08');
INSERT INTO "public"."activity_logs" VALUES ('bcc67a88-7a6c-49b8-9543-396697bfa9ac', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 11:42:38.368288+08');
INSERT INTO "public"."activity_logs" VALUES ('07d78352-7466-44ea-8018-bc82b08245ae', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 12:16:07.736831+08');
INSERT INTO "public"."activity_logs" VALUES ('1db3d15b-423b-43f9-a750-a246796fbd90', '794482be-bd9c-43d2-9c66-91e7a6773472', 'SHARE_TASK', '分享任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"share_token": "RFe5_LBU1tN7UuzOa6G7G4z42Or1Tcw8CG0R83gYlzg", "share_name": "\u82f1\u8bed\u8bfe\u5802\u8bad\u7ec3"}', '2026-03-31 13:39:48.762907+08');
INSERT INTO "public"."activity_logs" VALUES ('f0921679-1795-4409-a3c6-9407d40b0310', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 17:45:17.553706+08');
INSERT INTO "public"."activity_logs" VALUES ('c209e47b-8fb2-409c-b09b-35b6f434f52c', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 17:46:13.285993+08');
INSERT INTO "public"."activity_logs" VALUES ('dad7cee7-26f1-4174-99f1-b5c454be565a', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 21:04:06.348382+08');
INSERT INTO "public"."activity_logs" VALUES ('28278a91-5c31-4628-81f8-bb3e610c2585', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 21:49:30.166104+08');
INSERT INTO "public"."activity_logs" VALUES ('37667220-a7e2-4d56-9aa4-76a61beb218d', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 22:39:25.440847+08');
INSERT INTO "public"."activity_logs" VALUES ('bcdea60d-dc0f-4166-889d-fc6e0f2293ad', 'e1b2e3c8-c24d-4231-be09-c198de0028d1', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '1e649ec2-469f-4a1f-9fbf-5683bd2c85be', '{"old_status": "draft", "new_status": "ready"}', '2026-03-31 22:55:42.100305+08');
INSERT INTO "public"."activity_logs" VALUES ('3a6b9803-52a3-49db-a73b-bfff8b9c4686', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 08:53:45.495155+08');
INSERT INTO "public"."activity_logs" VALUES ('e29f47aa-f8d4-4e4e-a7c0-9dba4aa9146d', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 09:26:34.04983+08');
INSERT INTO "public"."activity_logs" VALUES ('17316e3e-4a12-4092-8c0f-29ed9918c385', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 12:07:29.372182+08');
INSERT INTO "public"."activity_logs" VALUES ('5d49bc6d-61c3-459d-abcc-100a8d48a9c6', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "published", "new_status": "ready"}', '2026-04-01 15:43:41.579604+08');
INSERT INTO "public"."activity_logs" VALUES ('e8f4fd75-b6dc-4205-a57b-a56353b10bbe', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "published", "new_status": "ready"}', '2026-04-01 15:43:49.247744+08');
INSERT INTO "public"."activity_logs" VALUES ('888c97dd-7e1e-4792-a542-704d8a1d4e62', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "published", "new_status": "ready"}', '2026-04-01 16:14:01.247933+08');
INSERT INTO "public"."activity_logs" VALUES ('742f33a5-9d9d-4619-bfbb-b80720eeae04', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 16:14:08.924187+08');
INSERT INTO "public"."activity_logs" VALUES ('610b20a5-37fa-492c-b53a-19e5afc7ce1a', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "published", "new_status": "ready"}', '2026-04-01 16:26:34.638165+08');
INSERT INTO "public"."activity_logs" VALUES ('4b64d32e-419f-4c6a-be20-fa4512de59a8', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 16:26:41.478909+08');
INSERT INTO "public"."activity_logs" VALUES ('90b6cf3d-e80f-4cc6-80ad-32b00b82281a', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 17:04:57.743983+08');
INSERT INTO "public"."activity_logs" VALUES ('ead8afb6-5667-4ee0-b740-6af5e1ad7fd2', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "published", "new_status": "ready"}', '2026-04-01 17:05:08.055544+08');
INSERT INTO "public"."activity_logs" VALUES ('5cb1e89f-ef4e-4afe-9274-99aa64051eb6', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "published", "new_status": "ready"}', '2026-04-01 17:25:00.612315+08');
INSERT INTO "public"."activity_logs" VALUES ('909602ad-5d6c-4907-9c79-04afa1fcbdc7', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 17:25:09.216521+08');
INSERT INTO "public"."activity_logs" VALUES ('ed2e0a60-c2eb-4a27-a955-9cbd5eab54e1', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 17:54:34.128578+08');
INSERT INTO "public"."activity_logs" VALUES ('2c5bbf8b-747e-4d73-892c-fdd9930538ab', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：ss', 'task_group', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 18:20:50.856299+08');
INSERT INTO "public"."activity_logs" VALUES ('964ae558-0786-458f-9453-c177f5999bbe', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 18:21:14.446301+08');
INSERT INTO "public"."activity_logs" VALUES ('6e28da2c-e8d1-42ae-bee6-4a0c53e0ac44', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 20:09:07.571715+08');
INSERT INTO "public"."activity_logs" VALUES ('4e8ece2e-5d0a-4538-8537-fdd176ecdf0c', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-01 20:10:12.849126+08');
INSERT INTO "public"."activity_logs" VALUES ('b8fac05e-ee0a-4805-90e1-c8fc4572aa34', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "published", "new_status": "ready"}', '2026-04-02 08:56:34.666805+08');
INSERT INTO "public"."activity_logs" VALUES ('1e66ece7-a61b-45b8-8533-c2d5f6f88dcb', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 09:02:16.044919+08');
INSERT INTO "public"."activity_logs" VALUES ('dc8846cb-acbe-43f4-be9e-aebd446c9b13', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 09:03:11.528437+08');
INSERT INTO "public"."activity_logs" VALUES ('e6b857db-c7e2-46e1-92bb-ca33f1449728', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 09:04:41.540626+08');
INSERT INTO "public"."activity_logs" VALUES ('b7ae9c84-7fa2-4699-bc1f-264a6f13a544', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 09:18:44.244967+08');
INSERT INTO "public"."activity_logs" VALUES ('b37b68ac-aaa2-46bd-8bfe-87870d93b825', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 09:23:11.075186+08');
INSERT INTO "public"."activity_logs" VALUES ('84c00d83-831a-44de-b43b-29e12099532a', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 11:32:13.637793+08');
INSERT INTO "public"."activity_logs" VALUES ('b8fa1f5d-e799-428b-ab68-08504a11e425', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 11:32:51.759274+08');
INSERT INTO "public"."activity_logs" VALUES ('a7e61eca-907d-4b92-b490-cb3ee2868c8c', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 11:35:32.665387+08');
INSERT INTO "public"."activity_logs" VALUES ('fae8e350-4714-4964-b82d-f9721398a718', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 11:36:07.351631+08');
INSERT INTO "public"."activity_logs" VALUES ('e09a9fd6-8c56-4a40-870b-0224bad664fa', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 11:48:35.674369+08');
INSERT INTO "public"."activity_logs" VALUES ('f1d11a28-4dbb-43c7-9c52-8408da9773af', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 11:49:08.977558+08');
INSERT INTO "public"."activity_logs" VALUES ('3ec61c7e-dffd-4132-8ce3-9920a4d8b77f', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 12:25:24.030973+08');
INSERT INTO "public"."activity_logs" VALUES ('613f5606-cca5-48cd-958c-15db0a608c63', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：二维码伴我生活', 'task_group', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 12:26:41.765732+08');
INSERT INTO "public"."activity_logs" VALUES ('a56d7545-f602-4d7d-93c0-7e37d553dbaa', '794482be-bd9c-43d2-9c66-91e7a6773472', 'PUBLISH_TASK', '发布任务：英语课堂训练', 'task_group', '0095e431-3d21-48a8-b162-47dd326f0cea', '{"old_status": "draft", "new_status": "ready"}', '2026-04-02 12:26:43.981548+08');

-- ----------------------------
-- Table structure for class_enrollments
-- ----------------------------
DROP TABLE IF EXISTS "public"."class_enrollments";
CREATE TABLE "public"."class_enrollments" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "class_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "student_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "joined_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of class_enrollments
-- ----------------------------
INSERT INTO "public"."class_enrollments" VALUES ('2c146e79-a335-4dea-ac52-e27178283013', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '893091d6-55f4-4806-afb9-485707f76783', 'active', '2026-03-26 18:53:09.365484+08');
INSERT INTO "public"."class_enrollments" VALUES ('814ad74d-5869-4534-9082-80cab10e9063', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', '983b024b-e580-4c7d-ad6f-c0c41c3dc989', 'active', '2026-03-27 22:19:49.864133+08');
INSERT INTO "public"."class_enrollments" VALUES ('aec47433-48db-4b60-951e-7519093f84fb', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', '08520a8b-f2ef-41e9-9bc9-16bc426e7254', 'active', '2026-03-27 22:19:49.888613+08');
INSERT INTO "public"."class_enrollments" VALUES ('884b07b5-c9d4-4d9e-9cd3-a1f7e099e491', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '69f418a0-7e1d-4032-919a-d192c19222b4', 'active', '2026-03-28 19:08:34.008376+08');
INSERT INTO "public"."class_enrollments" VALUES ('79076ad3-4270-41a4-9040-2580670fd567', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '4999fa2f-f227-43c6-bf38-933ae6677d68', 'active', '2026-04-02 11:31:04.684973+08');
INSERT INTO "public"."class_enrollments" VALUES ('354c3de4-15a9-4d64-9eda-12a90a184805', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '03731852-ed7a-4d15-aaf7-e3eebc520517', 'active', '2026-04-02 11:31:31.098057+08');
INSERT INTO "public"."class_enrollments" VALUES ('754abb2d-7fd3-4722-a6fb-58cd63e91f69', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', 'ab6289d3-0971-4013-bb01-c392296fc6cb', 'active', '2026-04-02 11:32:01.594149+08');

-- ----------------------------
-- Table structure for classes
-- ----------------------------
DROP TABLE IF EXISTS "public"."classes";
CREATE TABLE "public"."classes" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "course_id" varchar(36) COLLATE "pg_catalog"."default",
  "teacher_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "invite_code" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "start_time" timestamptz(6),
  "created_at" timestamptz(6) DEFAULT now()
)
;

-- ----------------------------
-- Records of classes
-- ----------------------------
INSERT INTO "public"."classes" VALUES ('d0b18231-bb66-4481-8ddd-e3088a1d25d6', NULL, '794482be-bd9c-43d2-9c66-91e7a6773472', '三年级一班', '69EF5D6D', 'active', NULL, '2026-03-26 18:24:28.609722+08');
INSERT INTO "public"."classes" VALUES ('253b4d1a-55d7-435b-8862-4bd72cd2b86e', NULL, 'a9906d17-dfb2-40d0-9642-ef25ed0be1e0', 'Regression Class Alpha', '7B6626ED', 'active', NULL, '2026-03-27 19:44:09.057533+08');
INSERT INTO "public"."classes" VALUES ('b53fd8f0-9cc7-4d25-a70c-30898db11006', NULL, 'a9906d17-dfb2-40d0-9642-ef25ed0be1e0', 'Regression Class Beta', '22BD4241', 'active', NULL, '2026-03-27 20:01:32.715791+08');
INSERT INTO "public"."classes" VALUES ('188e7298-6a00-447d-b83b-ee46fbe097e6', NULL, '794482be-bd9c-43d2-9c66-91e7a6773472', '春季班', '5C3B2A27', 'active', NULL, '2026-03-28 14:00:34.230073+08');
INSERT INTO "public"."classes" VALUES ('c3aa3b10-c40c-47d7-9e37-c6b8fea3aac1', NULL, 'e1b2e3c8-c24d-4231-be09-c198de0028d1', '2026年春季班', 'CE47D80D', 'active', NULL, '2026-03-31 13:40:42.491164+08');

-- ----------------------------
-- Table structure for courses
-- ----------------------------
DROP TABLE IF EXISTS "public"."courses";
CREATE TABLE "public"."courses" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "teacher_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "level" varchar(50) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of courses
-- ----------------------------

-- ----------------------------
-- Table structure for guest_sessions
-- ----------------------------
DROP TABLE IF EXISTS "public"."guest_sessions";
CREATE TABLE "public"."guest_sessions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "student_id_number" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6) NOT NULL,
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of guest_sessions
-- ----------------------------
INSERT INTO "public"."guest_sessions" VALUES ('26d9b50c-1812-4c4a-960c-85936d974f13', '983b024b-e580-4c7d-ad6f-c0c41c3dc989', 'DUEL001', 'Duel Student One', '2026-03-28 00:19:49.855628+08', '2026-03-27 22:19:49.856632+08');
INSERT INTO "public"."guest_sessions" VALUES ('1ec0f66c-aff9-46f0-9946-3484e60ff1e1', '08520a8b-f2ef-41e9-9bc9-16bc426e7254', 'DUEL002', 'Duel Student Two', '2026-03-28 00:19:49.880101+08', '2026-03-27 22:19:49.881087+08');
INSERT INTO "public"."guest_sessions" VALUES ('053d23ea-f97e-4527-8d12-06d6ab86d1ad', '4999fa2f-f227-43c6-bf38-933ae6677d68', '123580', '李宁', '2026-04-02 13:31:04.673965+08', '2026-04-02 11:31:04.675964+08');
INSERT INTO "public"."guest_sessions" VALUES ('ece756ac-5845-41c8-adac-c14279dc131f', '03731852-ed7a-4d15-aaf7-e3eebc520517', '84562', '中国', '2026-04-02 13:31:31.091054+08', '2026-04-02 11:31:31.092057+08');
INSERT INTO "public"."guest_sessions" VALUES ('d7895cdf-e2fc-455f-9874-67ffac14f924', 'ab6289d3-0971-4013-bb01-c392296fc6cb', '68845566', '王者荣耀', '2026-04-02 13:32:01.588096+08', '2026-04-02 11:32:01.588096+08');

-- ----------------------------
-- Table structure for live_challenge_sessions
-- ----------------------------
DROP TABLE IF EXISTS "public"."live_challenge_sessions";
CREATE TABLE "public"."live_challenge_sessions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "class_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "task_group_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "mode" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "participant_ids" json NOT NULL,
  "scoreboard" json NOT NULL,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "started_at" timestamptz(6),
  "ended_at" timestamptz(6),
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of live_challenge_sessions
-- ----------------------------
INSERT INTO "public"."live_challenge_sessions" VALUES ('a048384a-c983-4a2a-9d92-04428074f2cd', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-27T16:27:48.397000", "submitted": false, "rank": null}]', 'ended', '2026-03-27 16:27:48.384844+08', '2026-03-27 16:28:15.930333+08', '2026-03-28 00:27:48.353643+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('af180cfd-557d-4eae-badc-33f77cab9192', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', 'afe25f9e-7914-42eb-904f-ad9ee426e604', 'class_challenge', 'Regression Task Group 1 - 全班挑战', '["5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e", "c9b7c1fd-4f18-43bc-b167-e0011c6ccba6"]', '[{"student_id": "5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e", "student_name": "Regression Student One", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 1, "total_time_ms": 28863006, "submitted": true, "rank": 1}, {"student_id": "c9b7c1fd-4f18-43bc-b167-e0011c6ccba6", "student_name": "Regression Student Two", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "submitted": false, "rank": 2}]', 'ended', '2026-03-27 13:36:08.762581+08', '2026-03-27 13:40:07.334717+08', '2026-03-27 21:36:08.711304+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('eea5aec7-314b-4cc5-8b82-4b05e69a38b8', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["d12939a3-5564-4589-bf97-6724d04d6660", "39062a00-d11b-45bc-9234-452656091aa8"]', '[{"student_id": "d12939a3-5564-4589-bf97-6724d04d6660", "student_name": "\u5218\u661f", "answered_count": 1, "correct_count": 1, "total_tasks": 1, "current_index": 1, "total_time_ms": 6925, "started_at": "2026-03-30T06:25:29.376000", "submitted": true, "locked": true, "eliminated_for_round": false, "first_correct_at": "2026-03-30T06:25:36.301549", "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "39062a00-d11b-45bc-9234-452656091aa8", "student_name": "\u6e29\u7965", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": true, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-30 06:25:30.190708+08', '2026-03-30 06:25:36.303547+08', '2026-03-30 14:25:30.142322+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('8c456566-d736-41bd-bd8a-5bfbe424e749', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', 'afe25f9e-7914-42eb-904f-ad9ee426e604', 'class_challenge', 'Regression Task Group 1 - 全班挑战', '["5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e", "c9b7c1fd-4f18-43bc-b167-e0011c6ccba6"]', '[{"student_id": "5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e", "student_name": "Regression Student One", "answered_count": 0, "correct_count": 1, "total_tasks": 1, "current_index": 0, "total_time_ms": 28854275, "submitted": false, "rank": 1}, {"student_id": "c9b7c1fd-4f18-43bc-b167-e0011c6ccba6", "student_name": "Regression Student Two", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "submitted": false, "rank": 2}]', 'active', '2026-03-27 13:46:20.986523+08', NULL, '2026-03-27 21:46:20.963625+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('dcab6f20-9cc8-4af2-8463-aee5d1fa5bc4', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["a269502b-1342-47db-b659-fec00fcfb43f", "dd29d1c4-102f-4a24-b1c9-7e23fc45f4c8"]', '[{"student_id": "a269502b-1342-47db-b659-fec00fcfb43f", "student_name": "2hao", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "rank": 1}, {"student_id": "dd29d1c4-102f-4a24-b1c9-7e23fc45f4c8", "student_name": "333", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "rank": 2}]', 'ended', '2026-03-31 09:28:00.849261+08', '2026-03-31 10:32:59.349385+08', '2026-03-31 09:28:00.765858+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('07236bc2-9e06-42f8-8e29-b90efc3ee046', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-27T16:21:09.892000", "submitted": false, "rank": null}]', 'ended', '2026-03-27 16:21:09.877234+08', '2026-03-27 16:21:37.649396+08', '2026-03-28 00:21:09.855788+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('64049dc3-1a85-46fc-bb47-26d18dba7d2c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-01 19:54:49.053346+08', '2026-04-01 20:07:46.400054+08', '2026-04-01 19:54:48.993082+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('a99de309-9766-4106-b2f8-bdf34fbe683c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-01 20:11:03.593099+08', '2026-04-01 20:12:45.752155+08', '2026-04-01 20:11:03.565313+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('9ace41ce-42dc-48a0-bacd-257509b2a59e', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 09:02:28.448976+08', '2026-04-02 09:02:57.149645+08', '2026-04-02 09:02:28.366846+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('a4fbcbc4-5aa9-4571-97d9-1edd30c1c430', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-01 20:09:17.681658+08', '2026-04-01 20:10:03.746788+08', '2026-04-01 20:09:17.653633+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d1b620f1-ff88-4b3b-aa53-baaa41148d4c', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', 'afe25f9e-7914-42eb-904f-ad9ee426e604', 'duel', 'Regression Task Group 1 - 双人 PK', '["08520a8b-f2ef-41e9-9bc9-16bc426e7254", "983b024b-e580-4c7d-ad6f-c0c41c3dc989"]', '[{"student_id": "08520a8b-f2ef-41e9-9bc9-16bc426e7254", "student_name": "Duel Student Two", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 1, "total_time_ms": 104587, "started_at": "2026-03-27T14:27:58.844000", "submitted": true, "rank": 1}, {"student_id": "983b024b-e580-4c7d-ad6f-c0c41c3dc989", "student_name": "Duel Student One", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-27T14:27:58.844000", "submitted": false, "rank": 2}]', 'ended', '2026-03-27 14:27:58.822045+08', '2026-03-27 14:29:43.568622+08', '2026-03-27 22:27:58.778524+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('f1737a79-7eb6-46b6-8aaf-e1136efea075', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 00:10:00.962803+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('8249d94b-11c7-4abe-9314-cd684e3e4096', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 09:04:07.482554+08', '2026-04-02 09:04:31.49603+08', '2026-04-02 09:04:07.413743+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('2892ec49-7bbc-4ded-96dc-16bed13224f2', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-27T16:10:43.504000", "submitted": false, "rank": null}]', 'ended', '2026-03-27 16:10:43.486425+08', '2026-03-27 16:11:10.90734+08', '2026-03-28 00:10:43.458073+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('36f18249-d7a7-4e16-9df9-956a653d76d3', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 09:04:50.270803+08', '2026-04-02 09:04:55.525501+08', '2026-04-02 09:04:50.217116+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('7f73d6a0-8c22-417e-bfca-2c5ec4d23d6c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 09:23:23.966959+08', '2026-04-02 09:44:43.804125+08', '2026-04-02 09:23:23.896886+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('cd8836ff-34cb-4a37-b5c3-31cc09236256', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 11:32:21.806202+08', '2026-04-02 11:32:27.317224+08', '2026-04-02 11:32:21.757686+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('b7647d56-e94a-48da-aca4-6c1f24b26a20', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 11:33:04.58515+08', '2026-04-02 11:35:07.35969+08', '2026-04-02 11:33:04.46606+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('400f34a3-64eb-45a3-b422-0bbd36f4febc', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练', '[]', '[]', 'ended', '2026-04-02 11:37:03.642037+08', '2026-04-02 11:48:30.539964+08', '2026-04-02 11:37:03.585675+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('ba15aeb2-2ef8-44d6-9ebf-b3bcd112cfda', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["69f418a0-7e1d-4032-919a-d192c19222b4", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T13:58:02.175000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T13:58:02.174000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-28 13:58:02.161099+08', '2026-03-28 14:32:46.222594+08', '2026-03-28 21:58:02.112693+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('0ab746b3-4920-43dc-981a-16fb0a5c4086', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T14:50:48.789000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T14:50:48.789000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-28 14:50:48.771103+08', '2026-03-28 15:28:07.075287+08', '2026-03-28 22:50:48.722531+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('b1a2eb3e-8215-401f-8322-19289d27c1bc', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:20:55.410454+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('ca083800-ea8d-4d0c-ab40-8e6cb7d5a9a6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:21:11.629811+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('e12d1907-0bed-4e55-bb1f-3f80d607b72f', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:22:29.401071+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('46aeda39-8b23-40d8-a599-fdccf67be126', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', NULL, '2026-03-28 15:24:18.068325+08', '2026-03-28 23:24:10.035284+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('55972308-b729-41bf-b943-c78da3687138', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-28 15:28:35.517635+08', '2026-03-28 15:28:35.538615+08', '2026-03-28 23:28:35.503623+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('c5324dc7-9a05-4dad-ba4e-02a8ffff2c37', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', NULL, '2026-03-28 15:21:11.537665+08', '2026-03-28 23:21:03.498018+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('fdd3f6e3-21a0-451d-98e5-aab4d7f9ba57', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:22:45.607952+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('1f33be48-6ad2-4b69-9f8e-e055c4a58c62', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', NULL, '2026-03-28 15:26:31.542747+08', '2026-03-28 23:26:23.505878+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('6f3aef80-035c-4476-9122-d11972bb11ec', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-28 15:28:07.148543+08', '2026-03-28 15:28:07.238804+08', '2026-03-28 23:28:07.126699+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('bc763e42-0284-4ac2-9d27-8e87a082b4e9', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-28 15:28:07.315387+08', '2026-03-28 15:28:07.339926+08', '2026-03-28 23:28:07.29736+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('2261fc22-01c9-4f75-92c9-19b4156d2b97', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', NULL, '2026-03-28 15:21:27.733027+08', '2026-03-28 23:21:19.705175+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('76bca528-c222-4be7-8179-502104986582', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:24:18.136637+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d7b18553-f323-4450-a979-2f2bfd890636', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:26:15.420875+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d76b0497-8d53-44fb-b12b-04ebc025a56b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', NULL, '2026-03-28 15:28:07.217275+08', '2026-03-28 23:28:07.20426+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('b427f853-2eef-44a7-998f-a065a14f8791', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["ab6289d3-0971-4013-bb01-c392296fc6cb", "03731852-ed7a-4d15-aaf7-e3eebc520517"]', '[{"student_id": "03731852-ed7a-4d15-aaf7-e3eebc520517", "student_name": "\u4e2d\u56fd", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "ab6289d3-0971-4013-bb01-c392296fc6cb", "student_name": "\u738b\u8005\u8363\u8000", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-04-02 11:48:46.832089+08', '2026-04-02 11:48:50.670982+08', '2026-04-02 11:48:46.780849+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('ebe0f3b3-5a4a-4f18-a8ec-af0f6d37cf24', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', NULL, '2026-03-28 15:22:45.53519+08', '2026-03-28 23:22:37.495841+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('bf2b362b-8520-4081-9cce-c508d04f62c4', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', NULL, '2026-03-28 15:23:01.716525+08', '2026-03-28 23:22:53.68068+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('22e20bca-a40a-4604-8fa7-f4bf2eb27247', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:24:01.949269+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('5edd600d-490e-48a7-9cdf-6bcb3226c9df', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', NULL, '2026-03-28 15:26:15.350228+08', '2026-03-28 23:26:07.316731+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('cbf1a5b0-bd47-42af-9040-a491ddf7242f', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 2, "correct_count": 1, "total_tasks": 5, "current_index": 5, "total_time_ms": 4017414, "started_at": "2026-03-31T09:46:19.803000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "B"}]}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-31 17:46:19.779879+08', '2026-03-31 18:53:17.220066+08', '2026-03-31 17:46:19.725345+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('762d06f7-7355-49c8-8f61-6d19caf2f392', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', NULL, '2026-03-28 15:24:34.248949+08', '2026-03-28 23:24:26.209547+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('23a2de7e-70b6-41c1-88ee-31bd40fb4e64', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-28 23:25:59.229086+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('1ecc8c51-346e-4414-97ac-5f6abd15afcb', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-28 15:28:07.403084+08', '2026-03-28 15:28:35.45329+08', '2026-03-28 23:28:07.383569+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('364cb89f-5c56-4bed-b98d-a91bb8ade63b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 1, "correct_count": 1, "total_tasks": 1, "current_index": 1, "total_time_ms": 7, "started_at": "2026-03-28T15:28:35.875080", "submitted": true, "locked": true, "eliminated_for_round": false, "first_correct_at": "2026-03-28T15:28:35.882087", "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 1, "total_time_ms": 5, "started_at": "2026-03-28T15:28:35.863972", "submitted": true, "locked": true, "eliminated_for_round": true, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-28 15:28:35.854996+08', '2026-03-28 15:28:35.93018+08', '2026-03-28 23:28:35.840167+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('1c4446e7-e7b7-4e31-b587-9ef8f77aa79d', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 5, "current_index": 1, "total_time_ms": null, "started_at": "2026-03-28T15:28:35.634941", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-28 15:28:35.623203+08', '2026-03-28 15:28:35.653696+08', '2026-03-28 23:28:35.608278+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('59bf1ec6-4930-4973-a16b-0cc0d674c2f6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-28 15:28:35.751396+08', '2026-03-28 15:28:35.765391+08', '2026-03-28 23:28:35.734857+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('2b6a13ee-a304-4c93-b11e-79806d2881b9', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["ab6289d3-0971-4013-bb01-c392296fc6cb", "03731852-ed7a-4d15-aaf7-e3eebc520517"]', '[{"student_id": "03731852-ed7a-4d15-aaf7-e3eebc520517", "student_name": "\u4e2d\u56fd", "answered_count": 1, "correct_count": 1, "total_tasks": 1, "current_index": 1, "total_time_ms": 2659, "started_at": "2026-04-02T03:49:55.796000", "submitted": true, "locked": true, "eliminated_for_round": false, "first_correct_at": "2026-04-02T03:49:58.455024+00:00", "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "ab6289d3-0971-4013-bb01-c392296fc6cb", "student_name": "\u738b\u8005\u8363\u8000", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": true, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-04-02 11:49:53.908316+08', '2026-04-02 11:49:58.464015+08', '2026-04-02 11:49:53.864239+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('f9d3d213-ee65-467a-975f-cbfe7bcb462f', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-30 18:24:05.099729+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('b2cc1e13-2d48-43b2-b83a-1788064fe731', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-30 18:34:06.675564+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('4f6e51bb-468b-4f24-989e-710b61150351', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4", "d12939a3-5564-4589-bf97-6724d04d6660", "39062a00-d11b-45bc-9234-452656091aa8"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "d12939a3-5564-4589-bf97-6724d04d6660", "student_name": "\u5218\u661f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-30T06:37:09.158000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 3, "draft_answers": []}, {"student_id": "39062a00-d11b-45bc-9234-452656091aa8", "student_name": "\u6e29\u7965", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 4}]', 'ended', '2026-03-30 06:37:09.134157+08', '2026-03-30 06:37:11.708229+08', '2026-03-30 14:37:09.0902+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('cca3dc64-38e0-4dfd-ad71-c6bdce36d06e', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 2, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 15766, "started_at": "2026-03-30T10:47:34.361000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}]}, {"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 1, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-30T10:47:33.376000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-30 10:47:34.339833+08', '2026-03-30 19:14:53.970042+08', '2026-03-30 18:47:34.306662+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('78d0cfbd-ecd1-486e-be70-960cb7036662', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 5, "total_tasks": 5, "current_index": 5, "total_time_ms": 26428, "started_at": "2026-03-27T16:35:42.259000", "submitted": true, "rank": 1}]', 'ended', '2026-03-27 16:35:42.241828+08', '2026-03-27 16:36:08.688578+08', '2026-03-28 00:35:42.218835+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('3c5ef6a0-d06c-4135-9f68-ca6119e40cf6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4", "29a2b847-c55f-4953-b76b-5d596e07de69", "eed66e8f-df6e-4b15-a097-21fac43dfaaa"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "29a2b847-c55f-4953-b76b-5d596e07de69", "student_name": "1212", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}, {"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": null}]', 'draft', NULL, NULL, '2026-03-30 18:34:27.874733+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d709aa96-440d-40da-840e-5869398e1d32', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["d4ba22df-ee5b-45a3-ba54-e79c5061550d", "77cde590-d77c-44c1-b9be-2274f50e6f77"]', '[{"student_id": "d4ba22df-ee5b-45a3-ba54-e79c5061550d", "student_name": "Jaky", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 1, "total_time_ms": 4541, "started_at": "2026-03-30T00:31:57.586000", "submitted": true, "locked": true, "eliminated_for_round": true, "first_correct_at": null, "current_task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "rank": 1}, {"student_id": "77cde590-d77c-44c1-b9be-2274f50e6f77", "student_name": "Lee", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 1, "total_time_ms": 7024, "started_at": "2026-03-30T00:31:57.411000", "submitted": true, "locked": true, "eliminated_for_round": true, "first_correct_at": null, "current_task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "rank": 2}]', 'ended', '2026-03-30 00:31:57.478898+08', '2026-03-30 00:32:04.438603+08', '2026-03-30 08:31:57.440709+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('fe8e1b93-f5de-46a0-8320-8db0cc7d861b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "238887c0-95c4-477b-93a4-d91e3ae13c9b"]', '[{"student_id": "238887c0-95c4-477b-93a4-d91e3ae13c9b", "student_name": "\u4e09\u95e8\u5ce1", "answered_count": 0, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-29T14:16:30.623000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-29T14:16:30.260000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-29 14:16:30.590568+08', '2026-03-29 14:16:41.689321+08', '2026-03-29 22:16:30.515976+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('76f2e09a-f914-427d-afeb-351de8366ad8', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4", "238887c0-95c4-477b-93a4-d91e3ae13c9b"]', '[{"student_id": "238887c0-95c4-477b-93a4-d91e3ae13c9b", "student_name": "\u4e09\u95e8\u5ce1", "answered_count": 5, "correct_count": 5, "total_tasks": 5, "current_index": 5, "total_time_ms": 119308, "started_at": "2026-03-29T14:16:30.623000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-29T14:17:27.547000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 3, "draft_answers": []}]', 'ended', '2026-03-29 14:16:57.477745+08', '2026-03-29 14:39:14.568661+08', '2026-03-29 22:16:57.423031+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('fd1f83d8-9ee8-4c85-8dff-6ab3a0a6a635', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 4, "correct_count": 4, "total_tasks": 5, "current_index": 5, "total_time_ms": 22849, "started_at": "2026-03-27T16:44:35.368000", "submitted": true, "rank": 1}]', 'ended', '2026-03-27 16:44:35.348743+08', '2026-03-27 16:44:58.219003+08', '2026-03-28 00:44:35.307835+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('cf722533-2f2e-4f98-a390-87acd9c05d59', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4", "daf303d8-30cf-46aa-b1f8-3bc11136a398"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "daf303d8-30cf-46aa-b1f8-3bc11136a398", "student_name": "The", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-31T01:09:54.048000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 3}]', 'ended', '2026-03-31 09:09:55.141167+08', '2026-03-31 09:10:16.331823+08', '2026-03-31 09:09:55.043435+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('35669b6b-1747-4ae9-82fb-e14f7d4eab80', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'class_challenge', '英语课堂训练 - 全班挑战', '["893091d6-55f4-4806-afb9-485707f76783", "69f418a0-7e1d-4032-919a-d192c19222b4"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": null, "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-31T00:46:37.427000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-31 08:46:39.053644+08', '2026-03-31 08:48:38.666658+08', '2026-03-31 08:46:38.9691+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d9ab94ea-8ffd-4fd7-a8e8-20a4ce582122', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 4, "correct_count": 3, "total_tasks": 5, "current_index": 5, "total_time_ms": 31101, "started_at": "2026-03-30T09:41:43.324000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "C"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 3, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-30T09:41:44.246000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-30 09:41:44.217625+08', '2026-03-30 10:01:01.209051+08', '2026-03-30 17:41:44.156548+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('8c51aa12-ff86-4744-aa01-7d32d1ef36e5', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["a269502b-1342-47db-b659-fec00fcfb43f", "dd29d1c4-102f-4a24-b1c9-7e23fc45f4c8"]', '[{"student_id": "a269502b-1342-47db-b659-fec00fcfb43f", "student_name": "2hao", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-31T01:27:12.924000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": []}, {"student_id": "dd29d1c4-102f-4a24-b1c9-7e23fc45f4c8", "student_name": "333", "answered_count": 0, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-31T01:27:12.814000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-31 09:27:14.089694+08', '2026-03-31 09:27:37.576521+08', '2026-03-31 09:27:13.968669+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('e286de15-9315-4eff-953c-544aa335f7e2', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 2, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 30975, "started_at": "2026-03-30T09:25:06.903000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 1, "correct_count": 1, "total_tasks": 5, "current_index": 5, "total_time_ms": 25103, "started_at": "2026-03-30T09:25:06.001000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}]', 'ended', '2026-03-30 09:25:06.879084+08', '2026-03-30 09:25:37.882168+08', '2026-03-30 17:25:06.810477+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('bd8f8bb3-9a7a-43a4-a62c-d01c896edc9b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["29a2b847-c55f-4953-b76b-5d596e07de69", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "29a2b847-c55f-4953-b76b-5d596e07de69", "student_name": "1212", "answered_count": 2, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 17773, "started_at": "2026-03-30T08:43:19.700000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}]}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 2, "correct_count": 1, "total_tasks": 5, "current_index": 5, "total_time_ms": 33561, "started_at": "2026-03-30T08:43:20.526000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "C"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}]}]', 'ended', '2026-03-30 08:43:20.488057+08', '2026-03-30 08:43:54.091455+08', '2026-03-30 16:43:20.400015+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('f0a14c5d-9aff-4488-a33f-6ffb274afe39', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "3f8ac600-3c9c-4436-ac66-367797dd8245"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 3, "correct_count": 3, "total_tasks": 5, "current_index": 5, "total_time_ms": 40202, "started_at": "2026-03-30T07:24:28.943000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "3f8ac600-3c9c-4436-ac66-367797dd8245", "student_name": "\u674e\u4e1c", "answered_count": 1, "correct_count": 1, "total_tasks": 5, "current_index": 5, "total_time_ms": 35672, "started_at": "2026-03-30T07:24:28.162000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}]', 'ended', '2026-03-30 07:24:28.909912+08', '2026-03-30 07:25:09.149057+08', '2026-03-30 15:24:28.874257+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d6bd042a-a668-4208-ac36-0dc854439c67', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "238887c0-95c4-477b-93a4-d91e3ae13c9b"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 3, "total_tasks": 5, "current_index": 5, "total_time_ms": 1364159, "started_at": "2026-03-29T14:17:27.547000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "B"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["Seven", "In"]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "238887c0-95c4-477b-93a4-d91e3ae13c9b", "student_name": "\u4e09\u95e8\u5ce1", "answered_count": 5, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 1426804, "started_at": "2026-03-29T14:16:30.623000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "D"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["seven", "in"]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "false"}]}]', 'ended', '2026-03-29 14:39:21.482465+08', '2026-03-29 14:40:17.430512+08', '2026-03-29 22:39:21.433557+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('64902c26-ee3e-4f5f-80bb-54eb92d4dc60', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["d4ba22df-ee5b-45a3-ba54-e79c5061550d", "77cde590-d77c-44c1-b9be-2274f50e6f77"]', '[{"student_id": "77cde590-d77c-44c1-b9be-2274f50e6f77", "student_name": "Lee", "answered_count": 3, "correct_count": 3, "total_tasks": 5, "current_index": 5, "total_time_ms": 39260, "started_at": "2026-03-30T00:30:51.824000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "d4ba22df-ee5b-45a3-ba54-e79c5061550d", "student_name": "Jaky", "answered_count": 3, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 19909, "started_at": "2026-03-30T00:30:51.781000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "B"}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}]}]', 'ended', '2026-03-30 00:30:51.918651+08', '2026-03-30 00:31:31.088813+08', '2026-03-30 08:30:51.872955+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('482c6847-dcd7-45cb-a342-5088af199575', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 3, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-30T10:20:00.027000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": []}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 3, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-30T10:20:00.987000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-30 10:20:00.963033+08', '2026-03-30 10:46:24.572183+08', '2026-03-30 18:20:00.90775+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('188babb4-6b14-4fc5-9604-6bd02ab7a5da', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "3f8ac600-3c9c-4436-ac66-367797dd8245"]', '[{"student_id": "3f8ac600-3c9c-4436-ac66-367797dd8245", "student_name": "\u674e\u4e1c", "answered_count": 3, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 41537, "started_at": "2026-03-30T07:11:17.501000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "B"}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 3, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-30T07:11:18.268000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-30 07:11:18.246941+08', '2026-03-30 07:22:53.014012+08', '2026-03-30 15:11:18.184276+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('091c6a5c-ceb3-4f5b-8880-5ba63ff7a8f0', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["eed66e8f-df6e-4b15-a097-21fac43dfaaa", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "eed66e8f-df6e-4b15-a097-21fac43dfaaa", "student_name": "safdas", "answered_count": 3, "correct_count": 3, "total_tasks": 5, "current_index": 5, "total_time_ms": 32289, "started_at": "2026-03-30T10:01:07.171000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 2, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 40097, "started_at": "2026-03-30T10:01:08.111000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}]}]', 'ended', '2026-03-30 10:01:08.0878+08', '2026-03-30 10:01:48.213736+08', '2026-03-30 18:01:08.032173+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('544e3ad3-ab3a-4864-b2a9-578d7a66948b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["d4ba22df-ee5b-45a3-ba54-e79c5061550d", "77cde590-d77c-44c1-b9be-2274f50e6f77"]', '[{"student_id": "77cde590-d77c-44c1-b9be-2274f50e6f77", "student_name": "Lee", "answered_count": 5, "correct_count": 3, "total_tasks": 5, "current_index": 5, "total_time_ms": 45649, "started_at": "2026-03-30T00:32:37.745000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "B"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["Seven", "in"]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "d4ba22df-ee5b-45a3-ba54-e79c5061550d", "student_name": "Jaky", "answered_count": 4, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-30T00:32:37.723000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "A"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "A"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["T", "a"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "false"}]}]', 'ended', '2026-03-30 00:32:37.775584+08', '2026-03-30 00:33:38.831041+08', '2026-03-30 08:32:37.741608+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('c878863c-7d61-46fe-a40d-fcf816ef16dd', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "3f8ac600-3c9c-4436-ac66-367797dd8245"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 5, "total_tasks": 5, "current_index": 5, "total_time_ms": 69122, "started_at": "2026-03-30T06:53:43.271000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["seven", "in"]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "3f8ac600-3c9c-4436-ac66-367797dd8245", "student_name": "\u674e\u4e1c", "answered_count": 3, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 35246, "started_at": "2026-03-30T06:53:42.521000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "2", "0"]}]}]', 'ended', '2026-03-30 06:53:43.242413+08', '2026-03-30 06:54:52.399757+08', '2026-03-30 14:53:43.183712+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('6ddae990-5b37-49f7-92d8-1935b3523d89', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "238887c0-95c4-477b-93a4-d91e3ae13c9b"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 5, "correct_count": 4, "total_tasks": 5, "current_index": 5, "total_time_ms": 114792, "started_at": "2026-03-29T13:46:21.752000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "238887c0-95c4-477b-93a4-d91e3ae13c9b", "student_name": "\u4e09\u95e8\u5ce1", "answered_count": 5, "correct_count": 4, "total_tasks": 5, "current_index": 5, "total_time_ms": 121360, "started_at": "2026-03-29T13:46:22.126000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-29 13:46:22.082452+08', '2026-03-29 13:48:23.490596+08', '2026-03-29 21:46:21.979778+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('912da228-84b6-4604-b119-7ed9df6921e8', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "238887c0-95c4-477b-93a4-d91e3ae13c9b"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 3, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 958141, "started_at": "2026-03-29T13:46:21.752000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1}, {"student_id": "238887c0-95c4-477b-93a4-d91e3ae13c9b", "student_name": "\u4e09\u95e8\u5ce1", "answered_count": 5, "correct_count": 0, "total_tasks": 5, "current_index": 4, "total_time_ms": null, "started_at": "2026-03-29T13:46:22.126000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2}]', 'ended', '2026-03-29 13:52:02.908919+08', '2026-03-29 14:02:53.202858+08', '2026-03-29 21:52:02.853813+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('fc97210c-7984-4f71-97af-4254aa07d197', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["893091d6-55f4-4806-afb9-485707f76783", "238887c0-95c4-477b-93a4-d91e3ae13c9b"]', '[{"student_id": "238887c0-95c4-477b-93a4-d91e3ae13c9b", "student_name": "\u4e09\u95e8\u5ce1", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-29T13:46:22.126000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-29T13:46:21.752000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-29 13:50:08.309849+08', '2026-03-29 13:50:23.694705+08', '2026-03-29 21:50:08.256716+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('31264f9d-0caa-43ba-b453-5acc7ebde42d', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["69f418a0-7e1d-4032-919a-d192c19222b4", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T11:25:48.959000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T11:25:48.959000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-28 11:25:48.930985+08', '2026-03-28 19:47:20.545028+08', '2026-03-28 19:25:48.858619+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('aaa589e9-552f-4e81-93ff-ce4ebb4ac063', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["d12939a3-5564-4589-bf97-6724d04d6660", "39062a00-d11b-45bc-9234-452656091aa8"]', '[{"student_id": "d12939a3-5564-4589-bf97-6724d04d6660", "student_name": "\u5218\u661f", "answered_count": 5, "correct_count": 4, "total_tasks": 5, "current_index": 5, "total_time_ms": 98972, "started_at": "2026-03-30T06:22:12.304000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["7", ""]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "39062a00-d11b-45bc-9234-452656091aa8", "student_name": "\u6e29\u7965", "answered_count": 5, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 73210, "started_at": "2026-03-30T06:22:11.320000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "D"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["7", "in"]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "false"}]}]', 'ended', '2026-03-30 06:22:13.091094+08', '2026-03-30 06:23:51.283477+08', '2026-03-30 14:22:13.018627+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('e6de4465-3274-4038-9d16-43be2cb171c8', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'single_question_duel', '英语课堂训练 - 单题双人抢答', '["69f418a0-7e1d-4032-919a-d192c19222b4", "893091d6-55f4-4806-afb9-485707f76783"]', '[{"student_id": "69f418a0-7e1d-4032-919a-d192c19222b4", "student_name": "??????", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T11:55:15.662000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 1}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 1, "correct_count": 0, "total_tasks": 1, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-28T11:55:15.662000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "rank": 2}]', 'ended', '2026-03-28 11:55:15.633909+08', '2026-03-28 12:20:38.310484+08', '2026-03-28 19:55:15.585058+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('386e9dfc-2fae-443b-8674-386a31958924', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "3f8ac600-3c9c-4436-ac66-367797dd8245"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 4, "correct_count": 4, "total_tasks": 5, "current_index": 5, "total_time_ms": 39698, "started_at": "2026-03-30T06:42:39.169000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "3f8ac600-3c9c-4436-ac66-367797dd8245", "student_name": "\u674e\u4e1c", "answered_count": 4, "correct_count": 0, "total_tasks": 5, "current_index": 0, "total_time_ms": null, "started_at": "2026-03-30T06:42:40.672000", "submitted": false, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": []}]', 'ended', '2026-03-30 06:42:39.143254+08', '2026-03-30 06:50:13.918175+08', '2026-03-30 14:42:39.073763+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('340e1a65-9880-4e88-a2a3-6ea657e495e6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "3f8ac600-3c9c-4436-ac66-367797dd8245"]', '[{"student_id": "3f8ac600-3c9c-4436-ac66-367797dd8245", "student_name": "\u674e\u4e1c", "answered_count": 5, "correct_count": 5, "total_tasks": 5, "current_index": 5, "total_time_ms": 92447, "started_at": "2026-03-30T06:50:42.390000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "C"}, {"task_id": "aeb4b0ec-9f27-4882-9916-ecc093921e50", "answer": ["seven", "in"]}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 2, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 89572, "started_at": "2026-03-30T06:50:40.903000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "1", "2"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}]', 'ended', '2026-03-30 06:50:40.876125+08', '2026-03-30 06:52:14.843714+08', '2026-03-30 14:50:40.842993+08');
INSERT INTO "public"."live_challenge_sessions" VALUES ('d866ff3c-d667-4d6a-83d5-a8f3ce4cec87', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', 'duel', '英语课堂训练 - 双人 PK', '["893091d6-55f4-4806-afb9-485707f76783", "3f8ac600-3c9c-4436-ac66-367797dd8245"]', '[{"student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f", "answered_count": 4, "correct_count": 2, "total_tasks": 5, "current_index": 5, "total_time_ms": 23468, "started_at": "2026-03-30T08:27:20.916000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 1, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}, {"task_id": "e11f7cb0-d08e-4aaa-8f70-171212fb5e11", "answer": "B"}, {"task_id": "2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74", "answer": ["0", "2", "1"]}, {"task_id": "150366f1-53ca-492f-abb6-223ea662b8fd", "answer": "true"}]}, {"student_id": "3f8ac600-3c9c-4436-ac66-367797dd8245", "student_name": "\u674e\u4e1c", "answered_count": 1, "correct_count": 1, "total_tasks": 5, "current_index": 5, "total_time_ms": 225292, "started_at": "2026-03-30T08:27:20.070000", "submitted": true, "locked": false, "eliminated_for_round": false, "first_correct_at": null, "current_task_id": null, "rank": 2, "draft_answers": [{"task_id": "55a3135c-a1b5-4eac-96c8-efc43719dc72", "answer": "B"}]}]', 'ended', '2026-03-30 08:27:20.88929+08', '2026-03-30 08:31:05.364278+08', '2026-03-30 16:27:20.816563+08');

-- ----------------------------
-- Table structure for live_sessions
-- ----------------------------
DROP TABLE IF EXISTS "public"."live_sessions";
CREATE TABLE "public"."live_sessions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "class_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "group_id" varchar(36) COLLATE "pg_catalog"."default",
  "topic" varchar(200) COLLATE "pg_catalog"."default",
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "started_at" timestamptz(6),
  "ended_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of live_sessions
-- ----------------------------
INSERT INTO "public"."live_sessions" VALUES ('cf1581f0-8969-4213-8d68-f42a608ef695', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-26 18:26:43.112422+08', '2026-03-26 10:53:38.831866+08');
INSERT INTO "public"."live_sessions" VALUES ('bdc63393-e236-4d6d-bce8-81cb2495d35c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-26 18:54:19.733696+08', '2026-03-26 10:57:33.497578+08');
INSERT INTO "public"."live_sessions" VALUES ('d8e2474b-d157-4f36-b5f5-ddef7f354444', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-26 22:39:51.741038+08', '2026-03-26 14:48:23.453459+08');
INSERT INTO "public"."live_sessions" VALUES ('0d30143d-4ccd-4909-a934-ce387fbc108e', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-26 23:05:32.928917+08', '2026-03-26 15:06:02.279562+08');
INSERT INTO "public"."live_sessions" VALUES ('6ddb4289-7ebb-41a4-a206-903ada08c812', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-26 23:06:51.60467+08', '2026-03-26 15:07:03.394381+08');
INSERT INTO "public"."live_sessions" VALUES ('7f21dc33-4421-4cd0-a49b-c9d170a67baf', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-26 23:26:34.176463+08', '2026-03-26 15:26:42.760021+08');
INSERT INTO "public"."live_sessions" VALUES ('6d073c4f-1957-4fc0-9ceb-c3fdfbb5e91e', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-26 23:28:49.770509+08', '2026-03-26 15:28:56.131539+08');
INSERT INTO "public"."live_sessions" VALUES ('e0f84a13-d2ac-49ba-ab10-3d0c59a36974', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-26 23:45:47.08937+08', '2026-03-26 15:45:52.783564+08');
INSERT INTO "public"."live_sessions" VALUES ('7705dd56-9821-4e1b-ba37-6ec531495e40', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-27 09:57:20.928507+08', '2026-03-27 01:57:33.226769+08');
INSERT INTO "public"."live_sessions" VALUES ('3bbd598b-c93e-4f22-9cbe-6650fb9ba498', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-27 10:18:18.218557+08', '2026-03-27 02:18:29.984912+08');
INSERT INTO "public"."live_sessions" VALUES ('3cfff49a-d532-40e2-b5a8-cdef7bb4757b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-27 10:20:05.012026+08', '2026-03-27 02:21:16.250816+08');
INSERT INTO "public"."live_sessions" VALUES ('4b45737a-d56f-43bf-9538-c9ab9dc4353b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-27 10:52:51.19744+08', '2026-03-27 02:52:56.176446+08');
INSERT INTO "public"."live_sessions" VALUES ('26f915d6-9d9e-4ebe-a5e1-459755f97c9b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-27 10:56:24.403729+08', '2026-03-27 02:56:32.120579+08');
INSERT INTO "public"."live_sessions" VALUES ('a804d014-d8fb-448d-9673-e79cb14ba48e', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-27 23:47:13.14604+08', '2026-03-27 15:47:56.304589+08');
INSERT INTO "public"."live_sessions" VALUES ('b822d0ce-d651-4d6b-b6fd-1285bf5d219a', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-27 23:48:40.019229+08', '2026-03-27 15:49:53.389866+08');
INSERT INTO "public"."live_sessions" VALUES ('c409eff0-2074-442d-a3eb-1a92c7ff9f84', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-28 00:00:23.814909+08', '2026-03-27 16:00:24.865372+08');
INSERT INTO "public"."live_sessions" VALUES ('3df40b2f-735b-44c1-9863-78a1638d2a6b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-29 22:41:40.495716+08', '2026-03-29 14:42:54.543936+08');
INSERT INTO "public"."live_sessions" VALUES ('919cfc9b-5cb9-4baa-9078-17d0add823e1', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-29 22:43:35.896499+08', '2026-03-29 14:44:01.662867+08');
INSERT INTO "public"."live_sessions" VALUES ('c841b011-4186-4721-909d-8ae496720ee8', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-29 22:44:31.281545+08', '2026-03-29 14:44:42.343469+08');
INSERT INTO "public"."live_sessions" VALUES ('4c0b7932-93bb-4ae8-9987-ed1de1c248f0', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 08:33:42.297987+08', '2026-03-30 00:33:56.717185+08');
INSERT INTO "public"."live_sessions" VALUES ('2a983bba-c7d9-4371-a5df-388025ab7c02', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 08:34:29.53966+08', '2026-03-30 00:35:00.529245+08');
INSERT INTO "public"."live_sessions" VALUES ('edd7842a-fe2d-4c19-8129-49717c735547', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 09:52:32.200134+08', '2026-03-30 01:52:48.806177+08');
INSERT INTO "public"."live_sessions" VALUES ('f395d7bc-a55b-4bf5-9f00-1db5f8afc525', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 10:41:32.400539+08', '2026-03-30 02:42:07.936832+08');
INSERT INTO "public"."live_sessions" VALUES ('f5e082ed-f0f7-4edd-9e29-4bdb6858c527', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 11:19:00.612865+08', '2026-03-30 03:19:18.765888+08');
INSERT INTO "public"."live_sessions" VALUES ('22d3fdd4-640c-4f58-acc1-9a31a4b7adab', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 11:45:03.442861+08', '2026-03-30 03:50:20.724501+08');
INSERT INTO "public"."live_sessions" VALUES ('bb1dd707-9cdc-4978-9c72-008ad1c7de1c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 11:50:48.723009+08', '2026-03-30 04:03:06.851874+08');
INSERT INTO "public"."live_sessions" VALUES ('3fb98009-e42e-4dba-b4af-1ea67105d399', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 12:34:00.975208+08', '2026-03-30 05:47:32.335461+08');
INSERT INTO "public"."live_sessions" VALUES ('686356f6-cbfa-48b0-b1ad-53b94a40e7ff', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 13:50:14.005174+08', '2026-03-30 05:51:07.002208+08');
INSERT INTO "public"."live_sessions" VALUES ('584c4292-09fa-47d3-acfc-5af3ceafdb62', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 13:51:10.753036+08', '2026-03-30 05:53:21.356463+08');
INSERT INTO "public"."live_sessions" VALUES ('8d55b0e8-8384-4d03-b296-0f5ee2c615a6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '90129886-5c1f-4c12-997e-c75c17d89995', '科技改变世界', 'ended', '2026-03-30 13:53:26.144418+08', '2026-03-30 05:54:38.902252+08');
INSERT INTO "public"."live_sessions" VALUES ('8eab0111-4d7f-49b6-b3ae-2a8592052a5b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '90129886-5c1f-4c12-997e-c75c17d89995', '科技改变世界', 'ended', '2026-03-30 13:57:44.051996+08', '2026-03-30 05:58:20.227539+08');
INSERT INTO "public"."live_sessions" VALUES ('d725dc96-ffee-4c86-9c2c-70a476e851d5', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 13:58:40.298127+08', '2026-03-30 06:21:36.710304+08');
INSERT INTO "public"."live_sessions" VALUES ('f3cfd391-b918-473a-83e1-26ae059059ef', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-30 14:21:45.690037+08', '2026-03-30 06:22:07.331982+08');
INSERT INTO "public"."live_sessions" VALUES ('0e262cb5-cd3f-4e88-9a7b-3e110593210a', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 14:36:47.359851+08', '2026-03-30 06:36:49.850102+08');
INSERT INTO "public"."live_sessions" VALUES ('85cecb1c-3295-47d5-9c54-f000e3c467c1', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 15:23:31.711534+08', '2026-03-30 07:24:11.813179+08');
INSERT INTO "public"."live_sessions" VALUES ('a281ba06-96e7-42a3-8d9d-f0120d30a167', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-30 19:15:12.508629+08', '2026-03-30 19:15:25.455973+08');
INSERT INTO "public"."live_sessions" VALUES ('6cab3d2f-e238-4e47-8727-1c2b0e052308', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-30 23:44:16.526598+08', '2026-03-30 23:52:32.603815+08');
INSERT INTO "public"."live_sessions" VALUES ('afdc1b58-540d-4d32-bf6b-6eb522be309b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-30 23:53:14.769898+08', '2026-03-30 23:53:51.615885+08');
INSERT INTO "public"."live_sessions" VALUES ('e23a018b-9788-410a-b602-8e7efb9fca0c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 00:11:14.865319+08', '2026-03-31 00:28:14.099131+08');
INSERT INTO "public"."live_sessions" VALUES ('6510951e-2ab0-4a74-9224-1d7b7edabf55', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 08:28:16.192174+08', '2026-03-31 08:29:28.766642+08');
INSERT INTO "public"."live_sessions" VALUES ('5a0e2ae7-66db-4d9e-8385-3069a30f9fe1', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-03-31 08:40:37.319549+08', '2026-03-31 08:41:00.161758+08');
INSERT INTO "public"."live_sessions" VALUES ('2be0b4fb-ff40-4b08-a5bc-06f037c25bb6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 08:41:03.963627+08', '2026-03-31 08:41:43.831721+08');
INSERT INTO "public"."live_sessions" VALUES ('22259b56-0701-4e20-b95f-39198f45eca3', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 08:43:21.32913+08', '2026-03-31 08:44:35.596306+08');
INSERT INTO "public"."live_sessions" VALUES ('d350cf13-b2de-46a7-bde2-720346fd9740', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 08:45:34.547252+08', '2026-03-31 08:45:40.983519+08');
INSERT INTO "public"."live_sessions" VALUES ('7833cf82-17e2-4986-a29a-7b5df606ab27', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 08:49:04.873766+08', '2026-03-31 08:49:19.150955+08');
INSERT INTO "public"."live_sessions" VALUES ('3a9ec189-2ebf-4ea6-94c1-8330ed220ae9', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 08:57:37.316924+08', '2026-03-31 09:02:59.363105+08');
INSERT INTO "public"."live_sessions" VALUES ('220a15e1-39b1-4cc3-b02a-6c67e1061676', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 09:05:11.877915+08', '2026-03-31 09:05:38.075446+08');
INSERT INTO "public"."live_sessions" VALUES ('8d919028-3b48-4b34-b3ec-18a9a481a51f', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 09:05:51.351173+08', '2026-03-31 09:06:38.115719+08');
INSERT INTO "public"."live_sessions" VALUES ('1e3bf5c9-c9d7-468f-9b16-d69b631a5695', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 09:25:30.9683+08', '2026-03-31 09:25:48.119919+08');
INSERT INTO "public"."live_sessions" VALUES ('0754b54c-7dbd-422a-a8c2-e0d30626dce5', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 09:25:53.904595+08', '2026-03-31 09:26:34.806716+08');
INSERT INTO "public"."live_sessions" VALUES ('2598733e-c30e-487b-8ff8-0b73af5940e6', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 10:33:36.35794+08', '2026-03-31 11:43:42.169868+08');
INSERT INTO "public"."live_sessions" VALUES ('882a63f6-519c-4725-bfb3-1aa3d5e1f2d5', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 11:43:58.105711+08', '2026-03-31 12:14:31.699033+08');
INSERT INTO "public"."live_sessions" VALUES ('42d66e28-704f-456e-88a1-c4c89c3dcf01', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 12:16:14.117731+08', '2026-03-31 17:43:57.872078+08');
INSERT INTO "public"."live_sessions" VALUES ('f18e0e3d-0379-4f59-a656-0921edec896c', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-03-31 20:55:04.378843+08', '2026-03-31 20:55:19.655827+08');
INSERT INTO "public"."live_sessions" VALUES ('bdd3852e-4e6a-4938-9d90-b7220a79ea1a', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 21:04:24.844236+08', '2026-03-31 21:05:57.222877+08');
INSERT INTO "public"."live_sessions" VALUES ('f70243cb-d1fd-4dcd-9cf4-6caf0ece9720', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-03-31 21:59:14.563393+08', '2026-03-31 22:06:10.337255+08');
INSERT INTO "public"."live_sessions" VALUES ('2d647b93-afa5-4c5f-8688-cfb1af062b4f', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-01 00:01:41.272513+08', '2026-04-01 00:01:49.600997+08');
INSERT INTO "public"."live_sessions" VALUES ('e814d2c7-c24b-4ce2-ba33-b484541192f8', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-04-01 15:57:06.721228+08', '2026-04-01 16:02:36.761344+08');
INSERT INTO "public"."live_sessions" VALUES ('7bbf1b9e-96a8-4c19-98ea-57ffeb2927d1', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-01 16:14:36.010248+08', '2026-04-01 16:18:09.299685+08');
INSERT INTO "public"."live_sessions" VALUES ('c67be35f-60cf-4718-a406-b77ee37db294', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-04-01 16:18:09.308212+08', '2026-04-01 16:26:22.552173+08');
INSERT INTO "public"."live_sessions" VALUES ('089a0d1b-9296-427c-a752-2c5763289f09', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-01 16:34:06.294545+08', '2026-04-01 16:34:26.806224+08');
INSERT INTO "public"."live_sessions" VALUES ('2147699f-247e-478f-a9f2-6c95de6dc147', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-04-01 16:55:36.002279+08', '2026-04-01 17:09:11.9353+08');
INSERT INTO "public"."live_sessions" VALUES ('31a58f46-0d69-4e14-813b-dc996c8f92b4', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-01 17:09:11.942298+08', '2026-04-01 17:17:04.840052+08');
INSERT INTO "public"."live_sessions" VALUES ('90802e72-8fa1-45a4-89d0-a4fd47cd242b', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-04-01 17:17:04.848602+08', '2026-04-01 17:24:52.903108+08');
INSERT INTO "public"."live_sessions" VALUES ('973fe394-5d28-4a6e-a5c4-a40d8a0debf3', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-01 17:28:16.579048+08', '2026-04-01 17:36:32.557006+08');
INSERT INTO "public"."live_sessions" VALUES ('0ce5b8b0-c7b3-41f6-a7ae-70f143706a1e', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-04-01 17:36:40.599626+08', '2026-04-01 17:36:51.432118+08');
INSERT INTO "public"."live_sessions" VALUES ('6a20e65e-548f-4fd4-a414-cd050aa955a1', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-01 17:54:39.33476+08', '2026-04-01 17:55:19.041541+08');
INSERT INTO "public"."live_sessions" VALUES ('e2bf5f37-f2ed-433f-af40-18d269dd0c26', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-04-02 08:56:58.240001+08', '2026-04-02 08:58:34.726818+08');
INSERT INTO "public"."live_sessions" VALUES ('0155639c-1893-4a8e-a2e1-692cf5ecb5b7', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'ss', 'ended', '2026-04-02 09:11:08.319503+08', '2026-04-02 09:11:22.324049+08');
INSERT INTO "public"."live_sessions" VALUES ('67617416-c186-4594-bf51-16473b174168', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-04-02 09:45:01.341056+08', '2026-04-02 09:45:23.320186+08');
INSERT INTO "public"."live_sessions" VALUES ('a5fae293-96ee-46e0-9693-9c58fc7429e2', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-02 11:35:59.36684+08', '2026-04-02 11:36:02.41592+08');
INSERT INTO "public"."live_sessions" VALUES ('3e4074ef-faac-45ad-ad8a-36d747790c9d', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-04-02 12:25:43.296785+08', '2026-04-02 12:25:47.086929+08');
INSERT INTO "public"."live_sessions" VALUES ('6265df92-fd0e-450e-b38d-1665f42d0e5a', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '二维码伴我生活', 'ended', '2026-04-02 12:26:54.20585+08', '2026-04-02 12:26:56.634115+08');
INSERT INTO "public"."live_sessions" VALUES ('c6c7e298-0233-4278-a076-545679e6ce31', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '0095e431-3d21-48a8-b162-47dd326f0cea', '英语课堂训练', 'ended', '2026-04-02 12:26:56.643127+08', '2026-04-02 12:27:06.485593+08');

-- ----------------------------
-- Table structure for live_submissions
-- ----------------------------
DROP TABLE IF EXISTS "public"."live_submissions";
CREATE TABLE "public"."live_submissions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "task_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "student_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "answer" json NOT NULL,
  "is_correct" bool,
  "response_time_ms" int4,
  "submitted_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of live_submissions
-- ----------------------------
INSERT INTO "public"."live_submissions" VALUES ('94b67408-eb6c-4542-afa3-0a1c574f68f4', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"A"', 'f', NULL, '2026-03-26 23:05:59.528655+08');
INSERT INTO "public"."live_submissions" VALUES ('e0c4cb87-ae94-4a0e-affb-d7c4e4c1961c', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-26 23:05:59.528655+08');
INSERT INTO "public"."live_submissions" VALUES ('42ee2385-93c3-4140-bc54-d6db3f22d420', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["seven", "in"]', 't', NULL, '2026-03-26 23:05:59.528655+08');
INSERT INTO "public"."live_submissions" VALUES ('529afa81-53fb-4b47-807b-b8cc5d0954f5', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-26 23:05:59.528655+08');
INSERT INTO "public"."live_submissions" VALUES ('f7d65427-4b39-4c89-8b8c-6b43b51cfb30', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-26 23:05:59.528655+08');
INSERT INTO "public"."live_submissions" VALUES ('54d78678-9a8e-4264-b55e-8b04d8b2cc91', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-26 23:06:58.373356+08');
INSERT INTO "public"."live_submissions" VALUES ('d5a0fc0a-6291-4fc1-9e43-bcfe4fa45551', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-26 23:26:38.62345+08');
INSERT INTO "public"."live_submissions" VALUES ('79c41c72-3a05-45b7-bb9f-13e57d8406a0', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-26 23:28:54.34769+08');
INSERT INTO "public"."live_submissions" VALUES ('f73b3f90-3165-4da1-83d1-d2fc021b87f6', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-26 23:45:50.57221+08');
INSERT INTO "public"."live_submissions" VALUES ('d391a90d-e842-4097-903c-f336ac61050c', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-27 09:57:29.482811+08');
INSERT INTO "public"."live_submissions" VALUES ('82be94ca-f6a9-45ae-affa-62e6c898e4c5', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-27 10:20:23.68051+08');
INSERT INTO "public"."live_submissions" VALUES ('fe17d094-9dbb-414e-a0fb-5387a4503adb', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-27 10:52:54.314674+08');
INSERT INTO "public"."live_submissions" VALUES ('fec2388a-4f63-43e8-befb-738759754da2', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-27 10:56:30.195665+08');
INSERT INTO "public"."live_submissions" VALUES ('243a03c9-4c11-4527-8e73-72c5cb04a2d8', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"A"', 'f', NULL, '2026-03-27 23:47:49.62278+08');
INSERT INTO "public"."live_submissions" VALUES ('e2bfd022-736e-4441-9df2-72aa0333fe39', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-27 23:47:49.62278+08');
INSERT INTO "public"."live_submissions" VALUES ('69aad57d-3897-4669-b29b-10d58c9dd63f', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["seven", "in"]', 't', NULL, '2026-03-27 23:47:49.62278+08');
INSERT INTO "public"."live_submissions" VALUES ('0ffd58df-9e19-47d4-8ea7-d2892623b9e1', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-27 23:47:49.62278+08');
INSERT INTO "public"."live_submissions" VALUES ('0285a32a-1338-44bf-8469-0a39db75ef7d', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-27 23:47:49.62278+08');
INSERT INTO "public"."live_submissions" VALUES ('3ec26b1d-8707-4322-b516-7fe31f960f3f', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-03-27 23:49:48.41813+08');
INSERT INTO "public"."live_submissions" VALUES ('2b41c306-11b3-48f5-ac2b-9a31d08cc6bf', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-27 23:49:48.41813+08');
INSERT INTO "public"."live_submissions" VALUES ('c1e41b06-0f02-43e3-8167-64ed9d47cd9f', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["seven", "in"]', 't', NULL, '2026-03-27 23:49:48.41813+08');
INSERT INTO "public"."live_submissions" VALUES ('a14bea28-11a6-4b0c-86fe-935f2811a41f', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-27 23:49:48.41813+08');
INSERT INTO "public"."live_submissions" VALUES ('7ba353eb-b076-4462-87b7-c0267a29a1d0', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-27 23:49:48.41813+08');
INSERT INTO "public"."live_submissions" VALUES ('d81d56ff-c307-4d3d-9900-7a3414753d9b', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-03-29 22:42:41.932148+08');
INSERT INTO "public"."live_submissions" VALUES ('3e1cefa7-bddc-4ceb-9ed3-4699e5af011c', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 'f', NULL, '2026-03-29 22:42:41.932148+08');
INSERT INTO "public"."live_submissions" VALUES ('4d776223-ee8a-4615-a6b7-e7bafd375bf1', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["Seven", "In"]', 't', NULL, '2026-03-29 22:42:41.932148+08');
INSERT INTO "public"."live_submissions" VALUES ('78df145f-785e-43e9-8b3b-5df1bd6fc8b0', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-29 22:42:41.932148+08');
INSERT INTO "public"."live_submissions" VALUES ('4beeb64c-a353-448b-937f-65fe3b95e464', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-29 22:42:41.932148+08');
INSERT INTO "public"."live_submissions" VALUES ('92c8d5af-2765-43c1-bc05-ac9150d095b1', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["", ""]', 'f', NULL, '2026-03-29 22:43:42.44882+08');
INSERT INTO "public"."live_submissions" VALUES ('979b8f70-0884-4003-a3db-2540d659522a', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["", "", ""]', 'f', NULL, '2026-03-29 22:43:42.44882+08');
INSERT INTO "public"."live_submissions" VALUES ('3c763fce-32d0-4108-9c71-9730efca622a', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-30 09:52:39.501651+08');
INSERT INTO "public"."live_submissions" VALUES ('fc8cc8d1-60f2-4d6d-81e6-bacaef8b0323', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-30 13:50:59.392634+08');
INSERT INTO "public"."live_submissions" VALUES ('3d4d2eb8-3251-4fe8-953a-16cc417f334b', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-03-30 13:58:48.898041+08');
INSERT INTO "public"."live_submissions" VALUES ('3c0d3bc2-6349-487e-8cf3-6e6105ebafed', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-30 13:58:48.898041+08');
INSERT INTO "public"."live_submissions" VALUES ('35c77c05-1260-49b9-bc4a-7df1097b6ee0', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["7", ""]', 'f', NULL, '2026-03-30 13:58:48.898041+08');
INSERT INTO "public"."live_submissions" VALUES ('08a0fba4-af37-4ff8-901a-77d912cb0c39', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["", "", ""]', 'f', NULL, '2026-03-30 13:58:48.898041+08');
INSERT INTO "public"."live_submissions" VALUES ('05378482-52b9-48a9-a9c1-cba6a6ce5800', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-03-30 15:23:58.999514+08');
INSERT INTO "public"."live_submissions" VALUES ('d458f2f4-a3d7-4aa8-856a-df555fb31f82', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-30 15:23:58.999514+08');
INSERT INTO "public"."live_submissions" VALUES ('c7d68ee6-e01b-42dd-b2f7-1cbed2f378dd', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["", ""]', 'f', NULL, '2026-03-30 15:23:58.999514+08');
INSERT INTO "public"."live_submissions" VALUES ('bab96cca-8cfc-4bf7-b641-111b3aece2c2', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-30 15:23:58.999514+08');
INSERT INTO "public"."live_submissions" VALUES ('9ce74e14-d066-40e7-a906-03479dc6d602', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-30 15:23:58.999514+08');
INSERT INTO "public"."live_submissions" VALUES ('2fce2727-d54b-4a5b-a081-018a26a9b127', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-03-31 08:40:43.390482+08');
INSERT INTO "public"."live_submissions" VALUES ('ba371969-cae1-4780-b7fc-d8467ecae5fd', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 'f', NULL, '2026-03-31 08:41:35.415113+08');
INSERT INTO "public"."live_submissions" VALUES ('4f298c1a-3d31-4a8b-9f46-4461ef389065', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 'f', NULL, '2026-03-31 08:41:35.415113+08');
INSERT INTO "public"."live_submissions" VALUES ('15e12c63-16ea-4573-9c9d-dea5be76e2f6', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["", ""]', 'f', NULL, '2026-03-31 08:41:35.415113+08');
INSERT INTO "public"."live_submissions" VALUES ('bb8c35e1-69a4-4855-b661-052622f1d0c2', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["1", "1", "2"]', 'f', NULL, '2026-03-31 08:41:35.415113+08');
INSERT INTO "public"."live_submissions" VALUES ('3152655b-6d23-4cbd-b299-17f7c6a23d46', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-03-31 21:05:14.243424+08');
INSERT INTO "public"."live_submissions" VALUES ('93299b14-01e3-4055-887b-e3e8383a5346', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-31 21:05:14.243424+08');
INSERT INTO "public"."live_submissions" VALUES ('a69d24b1-6dfa-4a6f-a2b3-a168f1ebdc32', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["seven", "in"]', 't', NULL, '2026-03-31 21:05:14.243424+08');
INSERT INTO "public"."live_submissions" VALUES ('fb7fd407-9f9d-4134-9764-7f0f70098f1d', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-31 21:05:14.243424+08');
INSERT INTO "public"."live_submissions" VALUES ('8f7a1a4d-90fa-4f07-b6cc-fd6ce07271b9', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-31 21:05:14.243424+08');
INSERT INTO "public"."live_submissions" VALUES ('cb825fee-f67d-474c-b063-060d7000e5fd', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"A"', 'f', NULL, '2026-03-31 21:59:33.981282+08');
INSERT INTO "public"."live_submissions" VALUES ('d82f21a3-6d60-4d7c-876d-1a068f9d9caf', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-03-31 21:59:33.981282+08');
INSERT INTO "public"."live_submissions" VALUES ('ff327e4b-b6b8-4be9-a74a-a41dae84153c', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["seven", "in"]', 't', NULL, '2026-03-31 21:59:33.981282+08');
INSERT INTO "public"."live_submissions" VALUES ('aa06c386-b6e5-4fce-b15b-a1cae39cfd32', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-03-31 21:59:33.981282+08');
INSERT INTO "public"."live_submissions" VALUES ('4486fadb-38de-429c-bf06-32dae4184db9', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-03-31 21:59:33.981282+08');
INSERT INTO "public"."live_submissions" VALUES ('e981a83c-81f8-491b-9070-8600dc14e9fe', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-04-01 16:14:52.841619+08');
INSERT INTO "public"."live_submissions" VALUES ('fcc07a14-8053-4bf7-82dc-2403816b6e44', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-04-01 16:14:52.841619+08');
INSERT INTO "public"."live_submissions" VALUES ('8162e958-42fa-4735-ad63-e2b8d218c9f1', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["h", ""]', 'f', NULL, '2026-04-01 16:14:52.841619+08');
INSERT INTO "public"."live_submissions" VALUES ('90af6f6a-cceb-4d67-8622-abdb32ec97c5', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["", "", ""]', 'f', NULL, '2026-04-01 16:14:52.841619+08');
INSERT INTO "public"."live_submissions" VALUES ('69400d2d-b4a7-4dee-85be-00b9552faf5d', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-04-01 16:14:52.841619+08');
INSERT INTO "public"."live_submissions" VALUES ('f5d58fce-48e2-46a5-86cd-0176a43ee042', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-04-01 17:09:21.722236+08');
INSERT INTO "public"."live_submissions" VALUES ('df57c649-abf3-429b-9a51-9d1662b4d378', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 'f', NULL, '2026-04-01 17:09:21.722236+08');
INSERT INTO "public"."live_submissions" VALUES ('9a64c0b7-21cc-42a7-8b73-f24c399e58cc', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["", ""]', 'f', NULL, '2026-04-01 17:09:21.722236+08');
INSERT INTO "public"."live_submissions" VALUES ('76ac7c6b-b9df-4bf8-8f93-0d8166f62ee3', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["", "", ""]', 'f', NULL, '2026-04-01 17:09:21.722236+08');
INSERT INTO "public"."live_submissions" VALUES ('bbd00616-10f2-4b9c-9696-8f8b43885e17', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-04-01 17:09:21.722236+08');
INSERT INTO "public"."live_submissions" VALUES ('cf7025c5-cffd-4733-af13-7f09eefb8123', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"A"', 'f', NULL, '2026-04-01 17:28:28.798627+08');
INSERT INTO "public"."live_submissions" VALUES ('096ef117-eba2-4f98-b004-2b3923c7d33a', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 'f', NULL, '2026-04-01 17:28:28.798627+08');
INSERT INTO "public"."live_submissions" VALUES ('c3171fff-514c-4c7a-884b-a9896ad4a59f', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["", ""]', 'f', NULL, '2026-04-01 17:28:28.798627+08');
INSERT INTO "public"."live_submissions" VALUES ('5449f9a6-fc4e-48ce-aa42-9b4c7d38f2eb', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["", "", ""]', 'f', NULL, '2026-04-01 17:28:28.798627+08');
INSERT INTO "public"."live_submissions" VALUES ('7c4c0f85-fb67-4fc7-a7fd-c11717b900b9', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-04-01 17:28:28.798627+08');
INSERT INTO "public"."live_submissions" VALUES ('0409f302-d0c6-4ff1-965b-f91fb70f51eb', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '893091d6-55f4-4806-afb9-485707f76783', '"B"', 't', NULL, '2026-04-01 17:55:12.834415+08');
INSERT INTO "public"."live_submissions" VALUES ('45afe40e-e174-4895-a507-db160616a744', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '893091d6-55f4-4806-afb9-485707f76783', '"C"', 't', NULL, '2026-04-01 17:55:12.834415+08');
INSERT INTO "public"."live_submissions" VALUES ('3e975544-26fb-4da2-8a26-24e934464935', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '893091d6-55f4-4806-afb9-485707f76783', '["Seven", "in"]', 't', NULL, '2026-04-01 17:55:12.834415+08');
INSERT INTO "public"."live_submissions" VALUES ('b84cf1ac-c366-48d9-8011-8779f086dd7a', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '893091d6-55f4-4806-afb9-485707f76783', '["0", "1", "2"]', 't', NULL, '2026-04-01 17:55:12.834415+08');
INSERT INTO "public"."live_submissions" VALUES ('8155e589-a772-41d5-a799-7f386e6ec9a1', '150366f1-53ca-492f-abb6-223ea662b8fd', '893091d6-55f4-4806-afb9-485707f76783', '"true"', 't', NULL, '2026-04-01 17:55:12.834415+08');
INSERT INTO "public"."live_submissions" VALUES ('2ebc4114-fe16-4d63-9484-1384ee16a828', '46430759-1d4d-434b-9530-b60943de2084', '5e501fa1-b05e-4232-8bfb-6ddbe97b0941', '"__read__"', 'f', NULL, '2026-04-02 09:45:09.325301+08');
INSERT INTO "public"."live_submissions" VALUES ('9b879ec0-1773-4840-a2de-81e8eb2cea1c', '46430759-1d4d-434b-9530-b60943de2084', '893091d6-55f4-4806-afb9-485707f76783', '"__read__"', 'f', NULL, '2026-04-02 09:45:13.666789+08');
INSERT INTO "public"."live_submissions" VALUES ('a53fe5a0-25d2-4de5-a78a-c8058043971c', '46430759-1d4d-434b-9530-b60943de2084', '63f90dac-5615-4641-bf50-f3c87b6b4541', '"__read__"', 'f', NULL, '2026-04-02 09:45:19.247517+08');

-- ----------------------------
-- Table structure for live_task_group_submissions
-- ----------------------------
DROP TABLE IF EXISTS "public"."live_task_group_submissions";
CREATE TABLE "public"."live_task_group_submissions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "group_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "session_id" varchar(36) COLLATE "pg_catalog"."default",
  "student_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "task_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "answer" json NOT NULL,
  "is_correct" bool,
  "response_time_ms" int4,
  "submitted_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of live_task_group_submissions
-- ----------------------------
INSERT INTO "public"."live_task_group_submissions" VALUES ('118f38d7-2ea2-41b6-b065-c8051adaf12b', '0095e431-3d21-48a8-b162-47dd326f0cea', '0d30143d-4ccd-4909-a934-ce387fbc108e', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"A"', 'f', NULL, '2026-03-26 23:05:59.545177+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('0a426c8a-5ec7-4ad2-a7c8-133bf92e3cfc', '0095e431-3d21-48a8-b162-47dd326f0cea', '0d30143d-4ccd-4909-a934-ce387fbc108e', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-26 23:05:59.545177+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('2cb16815-18e3-4266-a7ee-77733c229251', '0095e431-3d21-48a8-b162-47dd326f0cea', '0d30143d-4ccd-4909-a934-ce387fbc108e', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["seven", "in"]', 't', NULL, '2026-03-26 23:05:59.545177+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('d8d63d13-8cd7-41d8-b7a9-946f871a7cbd', '0095e431-3d21-48a8-b162-47dd326f0cea', '0d30143d-4ccd-4909-a934-ce387fbc108e', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-26 23:05:59.545177+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('f00c2dc5-f862-439c-81c2-b19759b736f0', '0095e431-3d21-48a8-b162-47dd326f0cea', '0d30143d-4ccd-4909-a934-ce387fbc108e', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-26 23:05:59.545177+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('453e86a2-c79e-4c96-8ae2-85f238fc4a14', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '6ddb4289-7ebb-41a4-a206-903ada08c812', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-26 23:06:58.38835+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('151f2074-55ae-4a74-ac5e-e9aeaaa7dc7a', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '7f21dc33-4421-4cd0-a49b-c9d170a67baf', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-26 23:26:38.634462+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('d08409e4-764f-4d06-85bb-11640fe9ced8', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '6d073c4f-1957-4fc0-9ceb-c3fdfbb5e91e', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-26 23:28:54.366231+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('f8e22844-a9df-4eec-8ded-90bc989c7d84', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', 'e0f84a13-d2ac-49ba-ab10-3d0c59a36974', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-26 23:45:50.578245+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('5ca7f5a4-1637-485c-807c-ad6c0c653b97', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '7705dd56-9821-4e1b-ba37-6ec531495e40', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-27 09:57:29.499246+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('65ae80cc-e9ca-4996-b753-6ff7df6ea0ac', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '3cfff49a-d532-40e2-b5a8-cdef7bb4757b', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-27 10:20:23.685517+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('8845323b-7081-4e69-bbee-202120a5c7cd', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '4b45737a-d56f-43bf-9538-c9ab9dc4353b', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-27 10:52:54.321673+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('d7ca7f61-90fa-4aab-a697-ad901962647d', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '26f915d6-9d9e-4ebe-a5e1-459755f97c9b', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-27 10:56:30.206925+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('db0f8ae5-fbce-4fc2-a0a5-886dd343eb92', '0095e431-3d21-48a8-b162-47dd326f0cea', 'a804d014-d8fb-448d-9673-e79cb14ba48e', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"A"', 'f', NULL, '2026-03-27 23:47:49.642247+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('f064914d-c819-4fea-9bc9-b1f9d0615259', '0095e431-3d21-48a8-b162-47dd326f0cea', 'a804d014-d8fb-448d-9673-e79cb14ba48e', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-27 23:47:49.642247+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('00501802-3f5d-4b13-ba52-4ba29fa0beac', '0095e431-3d21-48a8-b162-47dd326f0cea', 'a804d014-d8fb-448d-9673-e79cb14ba48e', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["seven", "in"]', 't', NULL, '2026-03-27 23:47:49.642247+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('fac91550-6c77-47b4-8bc8-930b80a78192', '0095e431-3d21-48a8-b162-47dd326f0cea', 'a804d014-d8fb-448d-9673-e79cb14ba48e', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-27 23:47:49.642247+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('68c9a62b-dece-436e-b1dd-3d658f03d1a4', '0095e431-3d21-48a8-b162-47dd326f0cea', 'a804d014-d8fb-448d-9673-e79cb14ba48e', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-27 23:47:49.642247+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('172b1004-cf1d-4124-9419-17eb08b72f4b', '0095e431-3d21-48a8-b162-47dd326f0cea', 'b822d0ce-d651-4d6b-b6fd-1285bf5d219a', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-03-27 23:49:48.422138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('72a29f18-ad47-44ce-873b-0ef758707462', '0095e431-3d21-48a8-b162-47dd326f0cea', 'b822d0ce-d651-4d6b-b6fd-1285bf5d219a', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-27 23:49:48.422138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('572f20ee-4a15-49cc-80d3-5779ad97f123', '0095e431-3d21-48a8-b162-47dd326f0cea', 'b822d0ce-d651-4d6b-b6fd-1285bf5d219a', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["seven", "in"]', 't', NULL, '2026-03-27 23:49:48.422138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('dec38167-c557-4afa-92bf-d38c4fe4f076', '0095e431-3d21-48a8-b162-47dd326f0cea', 'b822d0ce-d651-4d6b-b6fd-1285bf5d219a', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-27 23:49:48.422138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('70591f32-a509-4922-9bf3-c02560015144', '0095e431-3d21-48a8-b162-47dd326f0cea', 'b822d0ce-d651-4d6b-b6fd-1285bf5d219a', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-27 23:49:48.422138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('700acf57-8731-4b3a-8174-a24f05c9154e', '0095e431-3d21-48a8-b162-47dd326f0cea', '3df40b2f-735b-44c1-9863-78a1638d2a6b', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-03-29 22:42:41.943278+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('1ceae028-3ea6-4ba3-b731-a9f2f52490e1', '0095e431-3d21-48a8-b162-47dd326f0cea', '3df40b2f-735b-44c1-9863-78a1638d2a6b', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"B"', 'f', NULL, '2026-03-29 22:42:41.943278+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('d2b9b0c8-e8ea-4b42-9e00-be83e03eca13', '0095e431-3d21-48a8-b162-47dd326f0cea', '3df40b2f-735b-44c1-9863-78a1638d2a6b', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["Seven", "In"]', 't', NULL, '2026-03-29 22:42:41.943278+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('f3b49b46-ef47-40cf-9e72-0b98d9c13eba', '0095e431-3d21-48a8-b162-47dd326f0cea', '3df40b2f-735b-44c1-9863-78a1638d2a6b', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-29 22:42:41.943278+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('97774b83-3f1e-4d87-bda4-804f8a0e6b41', '0095e431-3d21-48a8-b162-47dd326f0cea', '3df40b2f-735b-44c1-9863-78a1638d2a6b', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-29 22:42:41.943278+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('75e5779b-dade-4d4c-8df5-9ee565d4127b', '0095e431-3d21-48a8-b162-47dd326f0cea', '919cfc9b-5cb9-4baa-9078-17d0add823e1', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["", ""]', 'f', NULL, '2026-03-29 22:43:42.451811+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('d6d04265-cd52-43e5-b946-1287b9a99a86', '0095e431-3d21-48a8-b162-47dd326f0cea', '919cfc9b-5cb9-4baa-9078-17d0add823e1', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["", "", ""]', 'f', NULL, '2026-03-29 22:43:42.451811+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('987b835b-fb3e-4433-afba-77bdebdc2537', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', 'edd7842a-fe2d-4c19-8129-49717c735547', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-30 09:52:39.528133+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('40a831d4-0ab9-4135-8d71-1eb64f6188d7', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '686356f6-cbfa-48b0-b1ad-53b94a40e7ff', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-30 13:50:59.43634+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('6344d900-1ba5-46da-aa36-cd2315376dbf', '0095e431-3d21-48a8-b162-47dd326f0cea', 'd725dc96-ffee-4c86-9c2c-70a476e851d5', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-03-30 13:58:48.922233+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('6f0ff687-1ec8-4612-81d9-10105707b3c4', '0095e431-3d21-48a8-b162-47dd326f0cea', 'd725dc96-ffee-4c86-9c2c-70a476e851d5', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-30 13:58:48.922233+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('87f4dcea-1fb9-4382-ae0e-792eb2f4458e', '0095e431-3d21-48a8-b162-47dd326f0cea', 'd725dc96-ffee-4c86-9c2c-70a476e851d5', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["7", ""]', 'f', NULL, '2026-03-30 13:58:48.922233+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('da239ee4-fc3b-4175-9310-84c78c1992b8', '0095e431-3d21-48a8-b162-47dd326f0cea', 'd725dc96-ffee-4c86-9c2c-70a476e851d5', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["", "", ""]', 'f', NULL, '2026-03-30 13:58:48.922233+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('de62ecb1-bf4c-4761-9434-6211cdba06ef', '0095e431-3d21-48a8-b162-47dd326f0cea', '85cecb1c-3295-47d5-9c54-f000e3c467c1', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-03-30 15:23:59.01203+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('ba010c64-2589-4bfc-b4d6-24ae6c869b96', '0095e431-3d21-48a8-b162-47dd326f0cea', '85cecb1c-3295-47d5-9c54-f000e3c467c1', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-30 15:23:59.01203+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('85da9726-b91d-407a-927e-d463d78b13d1', '0095e431-3d21-48a8-b162-47dd326f0cea', '85cecb1c-3295-47d5-9c54-f000e3c467c1', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["", ""]', 'f', NULL, '2026-03-30 15:23:59.01203+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('3adb4954-4e21-4572-95ed-40a6f3f4a2f7', '0095e431-3d21-48a8-b162-47dd326f0cea', '85cecb1c-3295-47d5-9c54-f000e3c467c1', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-30 15:23:59.01203+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('30590b70-0285-409c-83cf-2be189f0920f', '0095e431-3d21-48a8-b162-47dd326f0cea', '85cecb1c-3295-47d5-9c54-f000e3c467c1', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-30 15:23:59.01203+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('0ee11c71-d9ed-4e59-8ace-ade23f6b5dfb', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '5a0e2ae7-66db-4d9e-8385-3069a30f9fe1', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-03-31 08:40:43.435929+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('9d8e8395-1e1b-4660-b06f-df80a55ecb28', '0095e431-3d21-48a8-b162-47dd326f0cea', '2be0b4fb-ff40-4b08-a5bc-06f037c25bb6', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"C"', 'f', NULL, '2026-03-31 08:41:35.440444+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('ed2c5975-1480-4520-863a-ae5d13da8df0', '0095e431-3d21-48a8-b162-47dd326f0cea', '2be0b4fb-ff40-4b08-a5bc-06f037c25bb6', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"B"', 'f', NULL, '2026-03-31 08:41:35.440444+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('973c3d74-0721-460b-a3cd-5ccb628ccfe7', '0095e431-3d21-48a8-b162-47dd326f0cea', '2be0b4fb-ff40-4b08-a5bc-06f037c25bb6', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["", ""]', 'f', NULL, '2026-03-31 08:41:35.440444+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('40644d90-3c50-40dc-9c4a-60d6c4b6326a', '0095e431-3d21-48a8-b162-47dd326f0cea', '2be0b4fb-ff40-4b08-a5bc-06f037c25bb6', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["1", "1", "2"]', 'f', NULL, '2026-03-31 08:41:35.440444+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('2981a05c-cd9f-4a09-8091-aa6f0016c6a4', '0095e431-3d21-48a8-b162-47dd326f0cea', 'bdd3852e-4e6a-4938-9d90-b7220a79ea1a', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-03-31 21:05:14.293383+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('3f007715-46b4-4512-8e97-e1309f5bdc08', '0095e431-3d21-48a8-b162-47dd326f0cea', 'bdd3852e-4e6a-4938-9d90-b7220a79ea1a', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-31 21:05:14.293383+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('cb53badf-22cb-4237-9601-34e5d1dc7e9c', '0095e431-3d21-48a8-b162-47dd326f0cea', 'bdd3852e-4e6a-4938-9d90-b7220a79ea1a', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["seven", "in"]', 't', NULL, '2026-03-31 21:05:14.293383+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('45ac9745-5f97-4fe7-9608-6d3cd8e6f42c', '0095e431-3d21-48a8-b162-47dd326f0cea', 'bdd3852e-4e6a-4938-9d90-b7220a79ea1a', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-31 21:05:14.293383+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('46a8fe18-9fb2-43ce-a734-c97cc02434ec', '0095e431-3d21-48a8-b162-47dd326f0cea', 'bdd3852e-4e6a-4938-9d90-b7220a79ea1a', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-31 21:05:14.293383+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('e9814ff9-29fa-400a-a5b0-bcc94248e7c4', '0095e431-3d21-48a8-b162-47dd326f0cea', 'f70243cb-d1fd-4dcd-9cf4-6caf0ece9720', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"A"', 'f', NULL, '2026-03-31 21:59:33.988297+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('8e04891d-3190-40b2-9da7-0a00a2aec1f7', '0095e431-3d21-48a8-b162-47dd326f0cea', 'f70243cb-d1fd-4dcd-9cf4-6caf0ece9720', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-03-31 21:59:33.988297+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('34dbd009-0266-499d-ac99-84d325065b1f', '0095e431-3d21-48a8-b162-47dd326f0cea', 'f70243cb-d1fd-4dcd-9cf4-6caf0ece9720', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["seven", "in"]', 't', NULL, '2026-03-31 21:59:33.988297+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('31388444-d498-4bb2-b71a-654f09cee5a3', '0095e431-3d21-48a8-b162-47dd326f0cea', 'f70243cb-d1fd-4dcd-9cf4-6caf0ece9720', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-03-31 21:59:33.988297+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('5b01ffb2-4fe5-4132-ab37-51712adb4478', '0095e431-3d21-48a8-b162-47dd326f0cea', 'f70243cb-d1fd-4dcd-9cf4-6caf0ece9720', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-03-31 21:59:33.988297+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('94161288-6ec9-43a4-b69e-61ac404d1e1d', '0095e431-3d21-48a8-b162-47dd326f0cea', '7bbf1b9e-96a8-4c19-98ea-57ffeb2927d1', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-04-01 16:14:52.895798+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('bae32d99-dbc1-4861-867b-2015bc596de0', '0095e431-3d21-48a8-b162-47dd326f0cea', '7bbf1b9e-96a8-4c19-98ea-57ffeb2927d1', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-04-01 16:14:52.895798+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('8656e6be-f77f-4f80-910d-fbf5a2edbe5c', '0095e431-3d21-48a8-b162-47dd326f0cea', '7bbf1b9e-96a8-4c19-98ea-57ffeb2927d1', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["h", ""]', 'f', NULL, '2026-04-01 16:14:52.895798+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('6bdf18b0-782c-41ed-9e3d-e8f0627c75b1', '0095e431-3d21-48a8-b162-47dd326f0cea', '7bbf1b9e-96a8-4c19-98ea-57ffeb2927d1', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["", "", ""]', 'f', NULL, '2026-04-01 16:14:52.895798+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('b89d2fce-e029-4b8a-9e1a-ff02dc2d1ec9', '0095e431-3d21-48a8-b162-47dd326f0cea', '7bbf1b9e-96a8-4c19-98ea-57ffeb2927d1', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-04-01 16:14:52.895798+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('9f1cd14c-7691-4d7c-bf23-58ff7fe33de8', '0095e431-3d21-48a8-b162-47dd326f0cea', '31a58f46-0d69-4e14-813b-dc996c8f92b4', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-04-01 17:09:21.729794+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('91d00130-4638-445d-ad01-c60506edbded', '0095e431-3d21-48a8-b162-47dd326f0cea', '31a58f46-0d69-4e14-813b-dc996c8f92b4', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"B"', 'f', NULL, '2026-04-01 17:09:21.729794+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('a832a870-346a-4fb7-a2c3-4f75286b7f36', '0095e431-3d21-48a8-b162-47dd326f0cea', '31a58f46-0d69-4e14-813b-dc996c8f92b4', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["", ""]', 'f', NULL, '2026-04-01 17:09:21.729794+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('78e0b5a6-09ab-4fa3-9f13-049e1116247c', '0095e431-3d21-48a8-b162-47dd326f0cea', '31a58f46-0d69-4e14-813b-dc996c8f92b4', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["", "", ""]', 'f', NULL, '2026-04-01 17:09:21.729794+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('4d100372-bbeb-4656-8bbd-2f745a97fa0d', '0095e431-3d21-48a8-b162-47dd326f0cea', '31a58f46-0d69-4e14-813b-dc996c8f92b4', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-04-01 17:09:21.729794+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('4e1f90f1-99a4-4fbf-a040-26ac45f5730a', '0095e431-3d21-48a8-b162-47dd326f0cea', '973fe394-5d28-4a6e-a5c4-a40d8a0debf3', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"A"', 'f', NULL, '2026-04-01 17:28:28.806138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('833ecddf-b625-4f82-a591-27aa01f594bb', '0095e431-3d21-48a8-b162-47dd326f0cea', '973fe394-5d28-4a6e-a5c4-a40d8a0debf3', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"B"', 'f', NULL, '2026-04-01 17:28:28.806138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('a8862cb2-bb90-48d2-8b0c-a042d171746f', '0095e431-3d21-48a8-b162-47dd326f0cea', '973fe394-5d28-4a6e-a5c4-a40d8a0debf3', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["", ""]', 'f', NULL, '2026-04-01 17:28:28.806138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('771f4a13-d335-41b4-983e-c18a3267be78', '0095e431-3d21-48a8-b162-47dd326f0cea', '973fe394-5d28-4a6e-a5c4-a40d8a0debf3', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["", "", ""]', 'f', NULL, '2026-04-01 17:28:28.806138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('17cbca37-4d57-4c6b-9acb-de120364bce4', '0095e431-3d21-48a8-b162-47dd326f0cea', '973fe394-5d28-4a6e-a5c4-a40d8a0debf3', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-04-01 17:28:28.806138+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('4e9c1042-2bc1-41ae-a76d-9e674ae7d531', '0095e431-3d21-48a8-b162-47dd326f0cea', '6a20e65e-548f-4fd4-a414-cd050aa955a1', '893091d6-55f4-4806-afb9-485707f76783', '55a3135c-a1b5-4eac-96c8-efc43719dc72', '"B"', 't', NULL, '2026-04-01 17:55:12.840966+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('09d8e9c5-b228-4159-a929-f16b195b086b', '0095e431-3d21-48a8-b162-47dd326f0cea', '6a20e65e-548f-4fd4-a414-cd050aa955a1', '893091d6-55f4-4806-afb9-485707f76783', 'e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '"C"', 't', NULL, '2026-04-01 17:55:12.840966+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('66050e66-5915-45d8-ae31-ddba3d9cd16a', '0095e431-3d21-48a8-b162-47dd326f0cea', '6a20e65e-548f-4fd4-a414-cd050aa955a1', '893091d6-55f4-4806-afb9-485707f76783', 'aeb4b0ec-9f27-4882-9916-ecc093921e50', '["Seven", "in"]', 't', NULL, '2026-04-01 17:55:12.840966+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('4cbe1c77-f7f3-43d0-9e31-c36251843c85', '0095e431-3d21-48a8-b162-47dd326f0cea', '6a20e65e-548f-4fd4-a414-cd050aa955a1', '893091d6-55f4-4806-afb9-485707f76783', '2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '["0", "1", "2"]', 't', NULL, '2026-04-01 17:55:12.840966+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('0b82516a-8d4a-490d-b553-dec01fcbd954', '0095e431-3d21-48a8-b162-47dd326f0cea', '6a20e65e-548f-4fd4-a414-cd050aa955a1', '893091d6-55f4-4806-afb9-485707f76783', '150366f1-53ca-492f-abb6-223ea662b8fd', '"true"', 't', NULL, '2026-04-01 17:55:12.840966+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('d746fb6f-2d1a-472c-90ba-cfabffa4c9e5', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '67617416-c186-4594-bf51-16473b174168', '5e501fa1-b05e-4232-8bfb-6ddbe97b0941', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-04-02 09:45:09.357572+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('094d2710-5952-48fd-b2a6-664245c23ee3', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '67617416-c186-4594-bf51-16473b174168', '893091d6-55f4-4806-afb9-485707f76783', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-04-02 09:45:13.672849+08');
INSERT INTO "public"."live_task_group_submissions" VALUES ('52a9b79b-482e-4409-acfa-f1cb61c184dd', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', '67617416-c186-4594-bf51-16473b174168', '63f90dac-5615-4641-bf50-f3c87b6b4541', '46430759-1d4d-434b-9530-b60943de2084', '"__read__"', 'f', NULL, '2026-04-02 09:45:19.252502+08');

-- ----------------------------
-- Table structure for live_task_groups
-- ----------------------------
DROP TABLE IF EXISTS "public"."live_task_groups";
CREATE TABLE "public"."live_task_groups" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "class_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6),
  "updated_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of live_task_groups
-- ----------------------------
INSERT INTO "public"."live_task_groups" VALUES ('c7e9b70b-02a8-4bd2-ad2a-7e5c0625cf1d', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', 'ttt', 'draft', '2026-03-31 08:42:30.579018+08', '2026-03-31 21:13:17.892093+08');
INSERT INTO "public"."live_task_groups" VALUES ('1e649ec2-469f-4a1f-9fbf-5683bd2c85be', 'c3aa3b10-c40c-47d7-9e37-c6b8fea3aac1', '英语课堂训练', 'ready', '2026-03-31 13:40:54.501114+08', '2026-03-31 22:55:42.092768+08');
INSERT INTO "public"."live_task_groups" VALUES ('870c9ef6-c335-419d-b57f-173ea4dc7c5d', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', 'ss', 'draft', '2026-03-30 23:42:50.221869+08', '2026-04-02 09:11:08.301852+08');
INSERT INTO "public"."live_task_groups" VALUES ('afe25f9e-7914-42eb-904f-ad9ee426e604', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', 'Regression Task Group 1', 'ready', '2026-03-27 20:01:58.836057+08', '2026-03-27 20:02:33.24321+08');
INSERT INTO "public"."live_task_groups" VALUES ('3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '二维码伴我生活', 'draft', '2026-03-26 18:24:42.01689+08', '2026-04-02 12:26:54.179562+08');
INSERT INTO "public"."live_task_groups" VALUES ('90129886-5c1f-4c12-997e-c75c17d89995', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '科技改变世界', 'draft', '2026-03-30 13:51:49.085014+08', '2026-03-30 13:57:44.031779+08');
INSERT INTO "public"."live_task_groups" VALUES ('0095e431-3d21-48a8-b162-47dd326f0cea', 'd0b18231-bb66-4481-8ddd-e3088a1d25d6', '英语课堂训练', 'draft', '2026-03-26 20:38:00.394336+08', '2026-04-02 12:26:56.624092+08');

-- ----------------------------
-- Table structure for live_tasks
-- ----------------------------
DROP TABLE IF EXISTS "public"."live_tasks";
CREATE TABLE "public"."live_tasks" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "group_id" varchar(36) COLLATE "pg_catalog"."default",
  "session_id" varchar(36) COLLATE "pg_catalog"."default",
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "question" json NOT NULL,
  "countdown_seconds" int4,
  "order" int4,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "correct_answer" json
)
;

-- ----------------------------
-- Records of live_tasks
-- ----------------------------
INSERT INTO "public"."live_tasks" VALUES ('55a3135c-a1b5-4eac-96c8-efc43719dc72', '0095e431-3d21-48a8-b162-47dd326f0cea', NULL, 'single_choice', '{"text": "Which day comes immediately after Wednesday?", "options": [{"key": "A", "text": "Tuesday"}, {"key": "B", "text": "Thursday"}, {"key": "C", "text": "Friday"}, {"key": "D", "text": "Monday"}], "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "Thursday follows Wednesday in the standard weekly calendar."}', 30, 0, 'pending', '{"value": "B"}');
INSERT INTO "public"."live_tasks" VALUES ('e11f7cb0-d08e-4aaa-8f70-171212fb5e11', '0095e431-3d21-48a8-b162-47dd326f0cea', NULL, 'single_choice', '{"text": "Which of these days is part of the weekend?", "options": [{"key": "A", "text": "Monday"}, {"key": "B", "text": "Wednesday"}, {"key": "C", "text": "Saturday"}, {"key": "D", "text": "Friday"}], "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "Saturday and Sunday are typically considered the weekend days."}', 30, 1, 'pending', '{"value": "C"}');
INSERT INTO "public"."live_tasks" VALUES ('2ded7a11-a6bc-4b97-9f1a-1e5a9b746a74', '0095e431-3d21-48a8-b162-47dd326f0cea', NULL, 'matching', '{"text": "Match the day to its position in the week (starting with Monday as 1).", "pairs": [{"left": "Monday", "right": "1"}, {"left": "Wednesday", "right": "3"}, {"left": "Friday", "right": "5"}], "randomize_answer_position": false, "ai_meta": {"confidence": "medium", "source": "ai_generate"}, "explanation": "Monday is the 1st, Wednesday is the 3rd, and Friday is the 5th day."}', 60, 3, 'pending', '{"value": [0, 1, 2]}');
INSERT INTO "public"."live_tasks" VALUES ('150366f1-53ca-492f-abb6-223ea662b8fd', '0095e431-3d21-48a8-b162-47dd326f0cea', NULL, 'true_false', '{"text": "Sunday comes before Monday in the weekly cycle.", "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "In the standard weekly cycle, Sunday is the last day and Monday is the first, so Sunday comes before Monday."}', 30, 4, 'pending', '{"value": true}');
INSERT INTO "public"."live_tasks" VALUES ('aeb4b0ec-9f27-4882-9916-ecc093921e50', '0095e431-3d21-48a8-b162-47dd326f0cea', NULL, 'fill_blank', '{"text": {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "There are ______ days __ a week."}]}]}, "blanks": [{"position": 0, "answer": "seven"}, {"position": 1, "answer": "in"}], "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "A standard week consists of seven days."}', 45, 2, 'pending', '{"value": ["seven", "in"]}');
INSERT INTO "public"."live_tasks" VALUES ('46430759-1d4d-434b-9530-b60943de2084', '3c5e11e9-7f51-45e7-bcfc-f7bc31df0709', NULL, 'reading', '{"text": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "\u4e8c\u7ef4\u7801\u4f34\u6211\u751f\u6d3b\u5b66\u4e60\u5355"}]}]}, "passage": {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "# \u300a\u4e8c\u7ef4\u7801\u4f34\u6211\u751f\u6d3b\u300b\u5b66\u751f\u8bfe\u4e0a\u5b66\u4e60\u5355"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u4e00\u3001\u5b66\u4e60\u76ee\u6807"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "1. \u8ba4\u8bc6\u4e8c\u7ef4\u7801\uff0c\u77e5\u9053\u4e8c\u7ef4\u7801\u5728\u751f\u6d3b\u4e2d\u7684\u5e38\u89c1\u7528\u9014\u3002"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "2. \u5b66\u4f1a\u5b89\u5168\u3001\u6b63\u786e\u5730\u4f7f\u7528\u4e8c\u7ef4\u7801\uff0c\u63d0\u9ad8\u4fe1\u606f\u5b89\u5168\u610f\u8bc6\u3002"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "3. \u80fd\u4e3e\u4f8b\u8bf4\u51fa\u751f\u6d3b\u4e2d\u4e0e\u4e8c\u7ef4\u7801\u76f8\u5173\u7684\u573a\u666f\uff0c\u611f\u53d7\u79d1\u6280\u5e26\u6765\u7684\u4fbf\u5229\u3002"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}]}, {"type": "image", "attrs": {"src": "/api/v1/images/20260326_182526_d50ce2fb.png", "alt": null, "title": null, "width": 309, "height": 266}}, {"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u4e8c\u3001\u65b0\u77e5\u5c0f\u63a2\u7a76\uff1a\u8ba4\u8bc6\u4e8c\u7ef4\u7801"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "1. \u89c2\u5bdf\u8eab\u8fb9\u7684\u4e8c\u7ef4\u7801\uff0c\u5b83\u7684\u6837\u5b50\u662f\uff1a"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "   _________________________________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "2. \u4e8c\u7ef4\u7801\u548c\u666e\u901a\u6761\u5f62\u7801\u76f8\u6bd4\uff0c\u4f18\u52bf\u662f\uff1a"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "   \u25a1 \u80fd\u5b58\u66f4\u591a\u4fe1\u606f  \u25a1 \u626b\u63cf\u66f4\u5feb  \u25a1 \u6837\u5f0f\u66f4\u591a\u6837  \u25a1 \u4e0d\u77e5\u9053"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u4e09\u3001\u751f\u6d3b\u5927\u53d1\u73b0\uff1a\u4e8c\u7ef4\u7801\u5728\u54ea\u91cc"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "\u8bf7\u5199\u51fa\u4f60\u5728\u751f\u6d3b\u4e2d\u89c1\u8fc7\u4e8c\u7ef4\u7801\u7684\u5730\u65b9\uff08\u81f3\u5c113\u4e2a\uff09\uff1a"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "1. _________________  2. _________________  3. _________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "\u5b83\u4eec\u5206\u522b\u7528\u6765\u505a\u4ec0\u4e48\uff1f"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "_________________________________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "_________________________________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u56db\u3001\u64cd\u4f5c\u5c0f\u5b9e\u8df5\uff1a\u626b\u4e00\u626b\u4f53\u9a8c"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "\u5982\u679c\u6761\u4ef6\u5141\u8bb8\uff0c\u5728\u8001\u5e08\u6307\u5bfc\u4e0b\u5b89\u5168\u626b\u63cf\u4e00\u4e2a\u6b63\u89c4\u4e8c\u7ef4\u7801\uff0c\u5b8c\u6210\u8bb0\u5f55\uff1a"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "- \u626b\u51fa\u7684\u5185\u5bb9\u662f\uff1a____________________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "- \u8fd9\u4e2a\u4e8c\u7ef4\u7801\u7ed9\u6211\u7684\u4fbf\u5229\u662f\uff1a__________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u4e94\u3001\u5b89\u5168\u5c0f\u8bfe\u5802\uff1a\u7528\u7801\u8981\u5f53\u5fc3"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "\u5224\u65ad\u4e0b\u5217\u884c\u4e3a\u662f\u5426\u6b63\u786e\uff0c\u5bf9\u7684\u6253\u221a\uff0c\u9519\u7684\u6253\u00d7\uff1a"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "1. \u968f\u4fbf\u626b\u8def\u8fb9\u964c\u751f\u4eba\u7ed9\u7684\u4e8c\u7ef4\u7801\u3002\uff08\uff09"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "2. \u626b\u4e8c\u7ef4\u7801\u524d\u5148\u770b\u6e05\u695a\u6765\u6e90\u662f\u5426\u6b63\u89c4\u3002\uff08\uff09"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "3. \u626b\u4e8c\u7ef4\u7801\u9700\u8981\u8f93\u5165\u5bc6\u7801\u3001\u94f6\u884c\u5361\u53f7\u65f6\u7acb\u523b\u505c\u6b62\u3002\uff08\uff09"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "4. \u5bb6\u957f\u624b\u673a\u91cc\u7684\u4e8c\u7ef4\u7801\u53ef\u4ee5\u968f\u610f\u53d1\u7ed9\u522b\u4eba\u3002\uff08\uff09"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u516d\u3001\u6211\u7684\u6536\u83b7\u4e0e\u601d\u8003"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "1. \u4eca\u5929\u6211\u5b66\u5230\u4e86\uff1a___________________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "2. \u4ee5\u540e\u4f7f\u7528\u4e8c\u7ef4\u7801\u6211\u4f1a\uff1a_____________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "3. \u6211\u8fd8\u60f3\u4e86\u89e3\u5173\u4e8e\u4e8c\u7ef4\u7801\u7684\uff1a_________________________"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "## \u4e03\u3001\u8bfe\u540e\u5c0f\u4efb\u52a1"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "\u56de\u5bb6\u548c\u5bb6\u957f\u4e00\u8d77\u5bfb\u627e\u5bb6\u91cc\u7684\u4e8c\u7ef4\u7801\uff0c\u8bb0\u5f551\u4e2a\u5e76\u8bf4\u8bf4\u5b83\u7684\u7528\u9014\uff0c\u4e0b\u8282\u8bfe\u5206\u4eab\u3002"}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "hardBreak", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}]}, {"type": "text", "marks": [{"type": "textStyle", "attrs": {"color": "rgb(28, 31, 35)"}}], "text": "\u9700\u8981\u6211\u5e2e\u4f60**\u8c03\u6574\u6210\u4f4e\u5e74\u7ea7/\u9ad8\u5e74\u7ea7\u7248\u672c**\uff0c\u6216\u8005**\u505a\u6210\u53ef\u76f4\u63a5\u6253\u5370\u7684\u6392\u7248\u683c\u5f0f**\u5417\uff1f"}]}]}, "prompt": {"type": "doc", "content": [{"type": "paragraph"}]}, "answer_required": false}', 120, 0, 'pending', '{"value": "A"}');
INSERT INTO "public"."live_tasks" VALUES ('4847ec86-c9e7-4a86-a14d-d0b80b252f97', 'afe25f9e-7914-42eb-904f-ad9ee426e604', NULL, 'single_choice', '{"options": [{"key": "A", "text": "Could you help me?"}, {"key": "B", "text": "Help me now."}, {"key": "C", "text": "No thanks."}, {"key": "D", "text": "Be quiet."}], "text": "Choose the correct polite reply.", "randomize_answer_position": false}', 30, 0, 'pending', '{"value": "A"}');
INSERT INTO "public"."live_tasks" VALUES ('c85b9056-ac6c-4cd9-9584-ad26ace650f0', '90129886-5c1f-4c12-997e-c75c17d89995', NULL, 'reading', '{"text": {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "\u79d1\u6280\u6539\u53d8\u4e16\u754c"}]}]}, "passage": {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "\u7231\u4e0a\u4e86\u6492"}]}, {"type": "image", "attrs": {"src": "/api/v1/images/20260330_135213_e5fde424.png", "alt": null, "title": null, "width": 357, "height": 573}}, {"type": "paragraph", "attrs": {"textAlign": null}}]}, "prompt": {"type": "doc", "content": [{"type": "paragraph"}]}, "answer_required": false}', 120, 0, 'pending', 'null');
INSERT INTO "public"."live_tasks" VALUES ('17cee2c0-6563-4f8a-b4c0-763ab4fef472', '870c9ef6-c335-419d-b57f-173ea4dc7c5d', NULL, 'experiment', '{"text": {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "fgdgfdg"}]}]}, "html_url": "https://www.teachmate.top/gallery/HzXpcHBSp3oi6IL9", "answer_required": false}', 30, 0, 'pending', '{"value": "A"}');
INSERT INTO "public"."live_tasks" VALUES ('94909252-45f1-44df-8324-db7162a6af11', '1e649ec2-469f-4a1f-9fbf-5683bd2c85be', NULL, 'single_choice', '{"text": "Which day comes immediately after Wednesday?", "options": [{"key": "A", "text": "Tuesday"}, {"key": "B", "text": "Thursday"}, {"key": "C", "text": "Friday"}, {"key": "D", "text": "Monday"}], "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "Thursday follows Wednesday in the standard weekly calendar."}', 30, 0, 'pending', '{"value": "B"}');
INSERT INTO "public"."live_tasks" VALUES ('6ae1ddee-cfdf-4382-999e-cb2ff23c55f9', '1e649ec2-469f-4a1f-9fbf-5683bd2c85be', NULL, 'single_choice', '{"text": "Which of these days is part of the weekend?", "options": [{"key": "A", "text": "Monday"}, {"key": "B", "text": "Wednesday"}, {"key": "C", "text": "Saturday"}, {"key": "D", "text": "Friday"}], "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "Saturday and Sunday are typically considered the weekend days."}', 30, 1, 'pending', '{"value": "C"}');
INSERT INTO "public"."live_tasks" VALUES ('faddd5d4-c253-4f73-9fe8-7a97d825b897', '1e649ec2-469f-4a1f-9fbf-5683bd2c85be', NULL, 'fill_blank', '{"text": {"type": "doc", "content": [{"type": "paragraph", "attrs": {"textAlign": null}, "content": [{"type": "text", "text": "There are ______ days __ a week."}]}]}, "blanks": [{"position": 0, "answer": "seven"}, {"position": 1, "answer": "in"}], "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "A standard week consists of seven days."}', 45, 2, 'pending', '{"value": ["seven", "in"]}');
INSERT INTO "public"."live_tasks" VALUES ('23ff3222-ca4b-46db-b7af-a4f15370c7ab', '1e649ec2-469f-4a1f-9fbf-5683bd2c85be', NULL, 'matching', '{"text": "Match the day to its position in the week (starting with Monday as 1).", "pairs": [{"left": "Monday", "right": "1"}, {"left": "Wednesday", "right": "3"}, {"left": "Friday", "right": "5"}], "randomize_answer_position": false, "ai_meta": {"confidence": "medium", "source": "ai_generate"}, "explanation": "Monday is the 1st, Wednesday is the 3rd, and Friday is the 5th day."}', 60, 3, 'pending', '{"value": [0, 1, 2]}');
INSERT INTO "public"."live_tasks" VALUES ('4a740a1b-66db-40fb-80e9-792f00139022', '1e649ec2-469f-4a1f-9fbf-5683bd2c85be', NULL, 'true_false', '{"text": "Sunday comes before Monday in the weekly cycle.", "randomize_answer_position": false, "ai_meta": {"confidence": "high", "source": "ai_generate"}, "explanation": "In the standard weekly cycle, Sunday is the last day and Monday is the first, so Sunday comes before Monday."}', 30, 4, 'pending', '{"value": true}');

-- ----------------------------
-- Table structure for membership_plans
-- ----------------------------
DROP TABLE IF EXISTS "public"."membership_plans";
CREATE TABLE "public"."membership_plans" (
  "code" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "price_cents" int4 NOT NULL,
  "duration_days" int4,
  "max_classes" int4,
  "max_students_per_class" int4,
  "max_task_groups" int4,
  "max_study_packs" int4,
  "can_use_ai" bool,
  "is_active" bool,
  "sort_order" int4,
  "created_at" timestamptz(6),
  "updated_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of membership_plans
-- ----------------------------
INSERT INTO "public"."membership_plans" VALUES ('paid_monthly', '付费会员（月付）', '月度付费会员，包含 AI 与更高配额', 100, 30, 10, 60, NULL, NULL, 't', 't', 2, '2026-03-28 12:10:12.686651+08', '2026-03-31 11:42:00.351505+08');
INSERT INTO "public"."membership_plans" VALUES ('free', '免费会员', '基础教学功能与有限配额', 0, NULL, 2, 20, 5, 5, 'f', 't', 1, '2026-03-28 12:10:12.686651+08', '2026-03-31 16:28:47.343006+08');
INSERT INTO "public"."membership_plans" VALUES ('paid_yearly', '付费会员（年付）', '年度付费会员，包含 AI 与更高配额', 39900, 365, 10, 60, NULL, NULL, 't', 'f', 3, '2026-03-28 12:10:12.686651+08', '2026-04-01 08:29:04.24411+08');

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS "public"."notifications";
CREATE TABLE "public"."notifications" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "type" "public"."notificationtype" NOT NULL,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "content" text COLLATE "pg_catalog"."default",
  "data" json,
  "is_read" bool,
  "read_at" timestamptz(6),
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of notifications
-- ----------------------------
INSERT INTO "public"."notifications" VALUES ('110cf46d-3e49-4592-aa9a-741d0f2a74b0', 'e1b2e3c8-c24d-4231-be09-c198de0028d1', 'NEW_STUDENT_JOINED', '新学生加入：测试学生', '学生 测试学生 加入了您的班级「2026年春季班」', '{"class_id": "c3aa3b10-c40c-47d7-9e37-c6b8fea3aac1", "student_id": "893091d6-55f4-4806-afb9-485707f76783", "student_name": "\u6d4b\u8bd5\u5b66\u751f"}', 'f', NULL, '2026-03-31 22:47:57.633159+08');

-- ----------------------------
-- Table structure for password_reset_tokens
-- ----------------------------
DROP TABLE IF EXISTS "public"."password_reset_tokens";
CREATE TABLE "public"."password_reset_tokens" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "token" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "temp_password" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6) NOT NULL,
  "used" bool,
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of password_reset_tokens
-- ----------------------------

-- ----------------------------
-- Table structure for payment_orders
-- ----------------------------
DROP TABLE IF EXISTS "public"."payment_orders";
CREATE TABLE "public"."payment_orders" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "order_no" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "teacher_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "plan_code" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "amount" int4 NOT NULL,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "payment_channel" varchar(50) COLLATE "pg_catalog"."default",
  "wechat_prepay_id" varchar(100) COLLATE "pg_catalog"."default",
  "wechat_h5_url" varchar(1000) COLLATE "pg_catalog"."default",
  "paid_at" timestamptz(6),
  "raw_notify_payload" json,
  "created_at" timestamptz(6),
  "updated_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of payment_orders
-- ----------------------------
INSERT INTO "public"."payment_orders" VALUES ('c4a3cd16-547b-42b3-a77d-d4f55627a6cb', 'MEM20260331082141178498', 'e1b2e3c8-c24d-4231-be09-c198de0028d1', 'paid_monthly', 100, 'paid', 'wechat_pay', '4200003042202603314313436867', 'weixin://wxpay/bizpayurl?pr=Bv9Qk5Mz1', '2026-03-31 16:22:00+08', '{"amount": {"currency": "CNY", "payer_currency": "CNY", "payer_total": 100, "total": 100}, "appid": "wxa659d70c93d547ba", "attach": "", "bank_type": "CMB_DEBIT", "mchid": "1502646561", "out_trade_no": "MEM20260331082141178498", "payer": {"openid": "oM4Aq1G-hBpG1YCVl4cmoSN6AOSQ"}, "promotion_detail": [], "success_time": "2026-03-31T16:22:00+08:00", "trade_state": "SUCCESS", "trade_state_desc": "\u652f\u4ed8\u6210\u529f", "trade_type": "NATIVE", "transaction_id": "4200003042202603314313436867"}', '2026-03-31 16:21:42.141003+08', '2026-03-31 16:22:03.618544+08');
INSERT INTO "public"."payment_orders" VALUES ('62e677ff-880f-4f82-a115-5f88dbb69a8b', 'MEM20260331092539235687', '794482be-bd9c-43d2-9c66-91e7a6773472', 'paid_monthly', 100, 'pending', 'wechat_pay', NULL, 'weixin://wxpay/bizpayurl?pr=UcIB0FKz3', NULL, '{"amount": {"payer_currency": "CNY", "total": 100}, "appid": "wxa659d70c93d547ba", "mchid": "1502646561", "out_trade_no": "MEM20260331092539235687", "promotion_detail": [], "scene_info": {"device_id": ""}, "trade_state": "NOTPAY", "trade_state_desc": "\u8ba2\u5355\u672a\u652f\u4ed8"}', '2026-03-31 17:25:41.39947+08', '2026-03-31 17:25:46.12654+08');
INSERT INTO "public"."payment_orders" VALUES ('7634d80c-bde4-481e-9692-49de3b8705f0', 'MEM20260331105038058921', '794482be-bd9c-43d2-9c66-91e7a6773472', 'paid_yearly', 39900, 'pending', 'wechat_pay', NULL, 'weixin://wxpay/bizpayurl?pr=ma3dxAmz1', NULL, '{"code_url": "weixin://wxpay/bizpayurl?pr=ma3dxAmz1"}', '2026-03-31 18:50:40.054162+08', '2026-03-31 18:50:40.054162+08');
INSERT INTO "public"."payment_orders" VALUES ('b8f4c125-a01b-46a1-9c6b-2b6cbab78eda', 'MEM20260331110614680880', 'e1b2e3c8-c24d-4231-be09-c198de0028d1', 'paid_monthly', 100, 'paid', 'wechat_pay', '4200003104202603310773605236', 'weixin://wxpay/bizpayurl?pr=bCSI2k4z3', '2026-03-31 19:06:29+08', '{"amount": {"currency": "CNY", "payer_currency": "CNY", "payer_total": 100, "total": 100}, "appid": "wxa659d70c93d547ba", "attach": "", "bank_type": "CMB_DEBIT", "mchid": "1502646561", "out_trade_no": "MEM20260331110614680880", "payer": {"openid": "oM4Aq1G-hBpG1YCVl4cmoSN6AOSQ"}, "promotion_detail": [], "success_time": "2026-03-31T19:06:29+08:00", "trade_state": "SUCCESS", "trade_state_desc": "\u652f\u4ed8\u6210\u529f", "trade_type": "NATIVE", "transaction_id": "4200003104202603310773605236"}', '2026-03-31 19:06:15.336674+08', '2026-03-31 19:06:35.547207+08');
INSERT INTO "public"."payment_orders" VALUES ('e69d310e-f7b9-4c80-9ef3-3dae5d0c1370', 'MEM20260331144610678294', 'e1b2e3c8-c24d-4231-be09-c198de0028d1', 'paid_monthly', 100, 'pending', 'wechat_pay', NULL, 'weixin://wxpay/bizpayurl?pr=DlTc3d6z3', NULL, '{"amount": {"payer_currency": "CNY", "total": 100}, "appid": "wxa659d70c93d547ba", "mchid": "1502646561", "out_trade_no": "MEM20260331144610678294", "promotion_detail": [], "scene_info": {"device_id": ""}, "trade_state": "NOTPAY", "trade_state_desc": "\u8ba2\u5355\u672a\u652f\u4ed8"}', '2026-03-31 22:46:11.734251+08', '2026-03-31 22:46:15.148347+08');

-- ----------------------------
-- Table structure for practice_modules
-- ----------------------------
DROP TABLE IF EXISTS "public"."practice_modules";
CREATE TABLE "public"."practice_modules" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "study_pack_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "content" json NOT NULL,
  "order" int4 NOT NULL,
  "estimated_minutes" int4
)
;

-- ----------------------------
-- Records of practice_modules
-- ----------------------------
INSERT INTO "public"."practice_modules" VALUES ('ca0b9b4f-2257-430d-bcf6-072ab0bb3fd2', '2299bc65-fff0-44ef-934d-1b3f86f0fed5', 'vocabulary', '{"title": "Weekdays", "hints": "???????", "items": [{"word": "Monday", "meaning": "???", "phonetic": "/''m?nde?/"}, {"word": "Tuesday", "meaning": "???", "phonetic": "/''tju?zde?/"}]}', 0, 5);
INSERT INTO "public"."practice_modules" VALUES ('85fd2e21-7f6c-4ffe-96b7-f47f3f4dffb5', '2299bc65-fff0-44ef-934d-1b3f86f0fed5', 'speaking', '{"title": "Speaking Prompt", "hints": "Use one complete sentence.", "prompt": "Introduce your favorite weekday in one sentence."}', 1, 3);

-- ----------------------------
-- Table structure for student_profiles
-- ----------------------------
DROP TABLE IF EXISTS "public"."student_profiles";
CREATE TABLE "public"."student_profiles" (
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "grade_level" varchar(50) COLLATE "pg_catalog"."default",
  "avatar_url" varchar(500) COLLATE "pg_catalog"."default",
  "learning_stats" json
)
;

-- ----------------------------
-- Records of student_profiles
-- ----------------------------
INSERT INTO "public"."student_profiles" VALUES ('893091d6-55f4-4806-afb9-485707f76783', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('c9b7c1fd-4f18-43bc-b167-e0011c6ccba6', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('983b024b-e580-4c7d-ad6f-c0c41c3dc989', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('08520a8b-f2ef-41e9-9bc9-16bc426e7254', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('69f418a0-7e1d-4032-919a-d192c19222b4', 'test', NULL, '{}');
INSERT INTO "public"."student_profiles" VALUES ('d12939a3-5564-4589-bf97-6724d04d6660', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('39062a00-d11b-45bc-9234-452656091aa8', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('ee48966d-5de0-48f8-8dde-73721a9212f0', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('1b750698-70f0-4e4a-8342-275258972f8b', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('c1e46f64-6f9d-4454-9e61-0ea843772c40', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('264cbc3f-9725-4aa1-beda-5365c478f94c', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('902e01bd-9849-4d66-97cb-e3863ff3d921', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('ea4e6a47-924d-4762-ad03-086c9d817855', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('63f90dac-5615-4641-bf50-f3c87b6b4541', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('5e501fa1-b05e-4232-8bfb-6ddbe97b0941', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('4999fa2f-f227-43c6-bf38-933ae6677d68', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('03731852-ed7a-4d15-aaf7-e3eebc520517', NULL, NULL, NULL);
INSERT INTO "public"."student_profiles" VALUES ('ab6289d3-0971-4013-bb01-c392296fc6cb', NULL, NULL, NULL);

-- ----------------------------
-- Table structure for study_packs
-- ----------------------------
DROP TABLE IF EXISTS "public"."study_packs";
CREATE TABLE "public"."study_packs" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "class_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "title" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "due_date" timestamptz(6),
  "created_by" varchar(36) COLLATE "pg_catalog"."default" NOT NULL
)
;

-- ----------------------------
-- Records of study_packs
-- ----------------------------
INSERT INTO "public"."study_packs" VALUES ('2299bc65-fff0-44ef-934d-1b3f86f0fed5', 'b53fd8f0-9cc7-4d25-a70c-30898db11006', 'Regression Study Pack 1', 'Pack for regression flow', 'published', NULL, 'a9906d17-dfb2-40d0-9642-ef25ed0be1e0');

-- ----------------------------
-- Table structure for submissions
-- ----------------------------
DROP TABLE IF EXISTS "public"."submissions";
CREATE TABLE "public"."submissions" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "study_pack_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "student_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "module_id" varchar(36) COLLATE "pg_catalog"."default",
  "answers" json NOT NULL,
  "score" float8,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "submitted_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of submissions
-- ----------------------------
INSERT INTO "public"."submissions" VALUES ('77ea89ca-b276-4696-9ce1-8e062e4af8e7', '2299bc65-fff0-44ef-934d-1b3f86f0fed5', '5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e', 'ca0b9b4f-2257-430d-bcf6-072ab0bb3fd2', '{"0": "monday meaning", "1": "tuesday meaning"}', 0, 'completed', '2026-03-27 20:23:18.437111+08');

-- ----------------------------
-- Table structure for system_settings
-- ----------------------------
DROP TABLE IF EXISTS "public"."system_settings";
CREATE TABLE "public"."system_settings" (
  "key" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "value" text COLLATE "pg_catalog"."default",
  "category" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "is_secret" bool,
  "description" text COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6),
  "updated_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of system_settings
-- ----------------------------

-- ----------------------------
-- Table structure for task_group_shares
-- ----------------------------
DROP TABLE IF EXISTS "public"."task_group_shares";
CREATE TABLE "public"."task_group_shares" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "share_token" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "task_group_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "shared_by" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "share_name" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "share_description" text COLLATE "pg_catalog"."default",
  "is_active" bool,
  "view_count" int4,
  "copy_count" int4,
  "expires_at" timestamptz(6),
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of task_group_shares
-- ----------------------------
INSERT INTO "public"."task_group_shares" VALUES ('f2e98613-d1e9-43ca-abbf-785f6170cce9', 'RFe5_LBU1tN7UuzOa6G7G4z42Or1Tcw8CG0R83gYlzg', '0095e431-3d21-48a8-b162-47dd326f0cea', '794482be-bd9c-43d2-9c66-91e7a6773472', '英语课堂训练', 'asdfa', 't', 4, 1, NULL, '2026-03-31 13:39:48.746853+08');

-- ----------------------------
-- Table structure for teacher_memberships
-- ----------------------------
DROP TABLE IF EXISTS "public"."teacher_memberships";
CREATE TABLE "public"."teacher_memberships" (
  "teacher_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "plan_code" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "started_at" timestamptz(6),
  "expires_at" timestamptz(6),
  "trial_ends_at" timestamptz(6),
  "source" varchar(50) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6),
  "updated_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of teacher_memberships
-- ----------------------------
INSERT INTO "public"."teacher_memberships" VALUES ('f52f1eee-a485-4f63-ad8d-e95dfb5aebcd', 'free', 'free', '2026-03-28 12:10:12.711868+08', NULL, NULL, 'system', '2026-03-28 12:10:12.711868+08', '2026-03-28 12:10:12.711868+08');
INSERT INTO "public"."teacher_memberships" VALUES ('a9906d17-dfb2-40d0-9642-ef25ed0be1e0', 'free', 'free', '2026-03-28 12:10:12.713856+08', NULL, NULL, 'system', '2026-03-28 12:10:12.713856+08', '2026-03-28 12:10:12.713856+08');
INSERT INTO "public"."teacher_memberships" VALUES ('794482be-bd9c-43d2-9c66-91e7a6773472', 'paid_monthly', 'active', '2026-03-31 00:05:29.69469+08', '2026-05-01 07:59:59+08', NULL, 'admin', '2026-03-28 12:10:12.702193+08', '2026-03-31 00:05:29.697676+08');
INSERT INTO "public"."teacher_memberships" VALUES ('e1b2e3c8-c24d-4231-be09-c198de0028d1', 'paid_monthly', 'active', '2026-03-31 19:06:35.546207+08', '2026-05-30 16:22:03.616518+08', NULL, 'wechat_pay', '2026-03-28 12:10:12.709844+08', '2026-03-31 19:06:35.550827+08');

-- ----------------------------
-- Table structure for teacher_profiles
-- ----------------------------
DROP TABLE IF EXISTS "public"."teacher_profiles";
CREATE TABLE "public"."teacher_profiles" (
  "user_id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "bio" text COLLATE "pg_catalog"."default",
  "avatar_url" varchar(500) COLLATE "pg_catalog"."default",
  "settings" json
)
;

-- ----------------------------
-- Records of teacher_profiles
-- ----------------------------
INSERT INTO "public"."teacher_profiles" VALUES ('794482be-bd9c-43d2-9c66-91e7a6773472', NULL, NULL, NULL);
INSERT INTO "public"."teacher_profiles" VALUES ('e1b2e3c8-c24d-4231-be09-c198de0028d1', NULL, NULL, NULL);
INSERT INTO "public"."teacher_profiles" VALUES ('f52f1eee-a485-4f63-ad8d-e95dfb5aebcd', NULL, NULL, NULL);
INSERT INTO "public"."teacher_profiles" VALUES ('a9906d17-dfb2-40d0-9642-ef25ed0be1e0', NULL, NULL, NULL);

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default",
  "username" varchar(50) COLLATE "pg_catalog"."default",
  "password_hash" varchar(255) COLLATE "pg_catalog"."default",
  "name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "role" "public"."userrole" NOT NULL,
  "is_active" bool,
  "is_guest" bool,
  "failed_login_attempts" int4,
  "locked_until" timestamptz(6),
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO "public"."users" VALUES ('e1b2e3c8-c24d-4231-be09-c198de0028d1', '12702654@qq.com', 'alpslin', '$2b$12$17R8GveE.Z4aW.toVzLpleE63X7TLIMuyJMsPKSOAUskjpIGPNZum', 'alpslin', 'TEACHER', 't', 'f', 0, NULL, '2026-03-27 09:43:07.98582+08');
INSERT INTO "public"."users" VALUES ('55bccab2-2bd1-4ce0-bee0-ac72ae043cc4', 'admin@ownenglish.com', NULL, '$2b$12$yTks20U.jFHafYbvpcHCVuwajtK1gNgjBNkQGAEzzEGieTf90YruO', '超级管理员', 'admin', 't', 'f', 0, NULL, '2026-03-27 11:18:35.428156+08');
INSERT INTO "public"."users" VALUES ('39062a00-d11b-45bc-9234-452656091aa8', NULL, NULL, NULL, '温祥', 'STUDENT', 'f', 't', 0, NULL, '2026-03-30 14:21:37.71898+08');
INSERT INTO "public"."users" VALUES ('d12939a3-5564-4589-bf97-6724d04d6660', NULL, NULL, NULL, '刘星', 'STUDENT', 'f', 't', 0, NULL, '2026-03-30 14:21:20.033679+08');
INSERT INTO "public"."users" VALUES ('9b4517a1-2225-4e8d-8681-0fee87bac8d6', 'teacher2@test.com', NULL, '$2b$12$ReHMWtWq.ahmDBeOe5uib.IzYqbJNw.zGv9GbFfX5ym.0HKzifiO6', 'Test Teacher', 'TEACHER', 't', 'f', 0, NULL, '2026-03-27 12:01:54.695515+08');
INSERT INTO "public"."users" VALUES ('ee48966d-5de0-48f8-8dde-73721a9212f0', 'student2@test.com', NULL, '$2b$12$KGF1R13gnI/tdhRGXuNHQONzSSTJF1KjQg1hp8f0CPuhAGeEGUYCS', 'Test Student', 'STUDENT', 't', 'f', 0, NULL, '2026-03-27 12:02:05.489128+08');
INSERT INTO "public"."users" VALUES ('f52f1eee-a485-4f63-ad8d-e95dfb5aebcd', 'regression.teacher.20260327194149@example.com', 'reg_teacher_20260327194149', '$2b$12$vGBhUQx/IaRG0lMNpQRJ6Op0OSpAjN7yusTgDNaHvleVt8kNiNCfW', 'Regression Teacher 20260327194149', 'TEACHER', 't', 'f', 0, NULL, '2026-03-27 19:41:49.61396+08');
INSERT INTO "public"."users" VALUES ('a9906d17-dfb2-40d0-9642-ef25ed0be1e0', 'regression.teacher.20260327194324@example.com', 'reg_teacher_20260327194324', '$2b$12$DfJjDNzvw/5dKmJ8OYNDs.vcmxhG03RRap0NsKPih9P.Z07.TGyly', 'Regression Teacher 20260327194324', 'TEACHER', 't', 'f', 0, NULL, '2026-03-27 19:43:25.021078+08');
INSERT INTO "public"."users" VALUES ('5b0e8ec4-2cc4-4279-9fe0-386ad9a9f87e', NULL, NULL, NULL, 'Regression Student One', 'STUDENT', 'f', 't', 0, NULL, '2026-03-27 20:03:11.487821+08');
INSERT INTO "public"."users" VALUES ('c9b7c1fd-4f18-43bc-b167-e0011c6ccba6', NULL, NULL, NULL, 'Regression Student Two', 'STUDENT', 'f', 't', 0, NULL, '2026-03-27 20:03:11.516307+08');
INSERT INTO "public"."users" VALUES ('983b024b-e580-4c7d-ad6f-c0c41c3dc989', NULL, NULL, NULL, 'Duel Student One', 'STUDENT', 't', 't', 0, NULL, '2026-03-27 22:19:49.853618+08');
INSERT INTO "public"."users" VALUES ('08520a8b-f2ef-41e9-9bc9-16bc426e7254', NULL, NULL, NULL, 'Duel Student Two', 'STUDENT', 't', 't', 0, NULL, '2026-03-27 22:19:49.877355+08');
INSERT INTO "public"."users" VALUES ('69f418a0-7e1d-4032-919a-d192c19222b4', 'regression.duel.student@example.com', NULL, '$2b$12$UXEkjrqfzHZYdytScrdnJ.NChPEZpsS6lVb2joJVCzaph4vWkOnNC', '??????', 'STUDENT', 't', 'f', 0, NULL, '2026-03-28 19:08:33.985549+08');
INSERT INTO "public"."users" VALUES ('1b750698-70f0-4e4a-8342-275258972f8b', NULL, NULL, NULL, '酒店介绍', 'STUDENT', 'f', 't', 0, NULL, '2026-04-01 19:36:38.025381+08');
INSERT INTO "public"."users" VALUES ('893091d6-55f4-4806-afb9-485707f76783', 'student@test.com', 'student', '$2b$12$KGF1R13gnI/tdhRGXuNHQONzSSTJF1KjQg1hp8f0CPuhAGeEGUYCS', '测试学生', 'STUDENT', 't', 'f', 0, NULL, '2026-03-26 18:22:07.105965+08');
INSERT INTO "public"."users" VALUES ('c1e46f64-6f9d-4454-9e61-0ea843772c40', NULL, NULL, NULL, 'nfnd', 'STUDENT', 'f', 't', 0, NULL, '2026-04-01 19:40:07.009561+08');
INSERT INTO "public"."users" VALUES ('264cbc3f-9725-4aa1-beda-5365c478f94c', NULL, NULL, NULL, '公司卡', 'STUDENT', 'f', 't', 0, NULL, '2026-04-01 19:54:36.921366+08');
INSERT INTO "public"."users" VALUES ('902e01bd-9849-4d66-97cb-e3863ff3d921', NULL, NULL, NULL, '基地建设', 'STUDENT', 'f', 't', 0, NULL, '2026-04-01 20:08:51.645625+08');
INSERT INTO "public"."users" VALUES ('ea4e6a47-924d-4762-ad03-086c9d817855', NULL, NULL, NULL, 'd d d', 'STUDENT', 'f', 't', 0, NULL, '2026-04-01 20:10:54.591958+08');
INSERT INTO "public"."users" VALUES ('5e501fa1-b05e-4232-8bfb-6ddbe97b0941', NULL, NULL, NULL, '天气', 'STUDENT', 'f', 't', 0, NULL, '2026-04-02 09:07:21.333694+08');
INSERT INTO "public"."users" VALUES ('63f90dac-5615-4641-bf50-f3c87b6b4541', NULL, NULL, NULL, '张杰', 'STUDENT', 'f', 't', 0, NULL, '2026-04-02 09:01:59.846048+08');
INSERT INTO "public"."users" VALUES ('4999fa2f-f227-43c6-bf38-933ae6677d68', NULL, NULL, NULL, '李宁', 'STUDENT', 't', 't', 0, NULL, '2026-04-02 11:31:04.670961+08');
INSERT INTO "public"."users" VALUES ('03731852-ed7a-4d15-aaf7-e3eebc520517', NULL, NULL, NULL, '中国', 'STUDENT', 't', 't', 0, NULL, '2026-04-02 11:31:31.088034+08');
INSERT INTO "public"."users" VALUES ('ab6289d3-0971-4013-bb01-c392296fc6cb', NULL, NULL, NULL, '王者荣耀', 'STUDENT', 't', 't', 0, NULL, '2026-04-02 11:32:01.584047+08');
INSERT INTO "public"."users" VALUES ('794482be-bd9c-43d2-9c66-91e7a6773472', 'teacher@test.com', 'teacher', '$2b$12$PqJrWGJyqHmkPBwl.pUCcOzbCxFT/qiOMXK.tFikBB6u3xK.hm4B.', '测试老师', 'TEACHER', 't', 'f', 0, NULL, '2026-03-26 18:22:06.893231+08');

-- ----------------------------
-- Table structure for verification_codes
-- ----------------------------
DROP TABLE IF EXISTS "public"."verification_codes";
CREATE TABLE "public"."verification_codes" (
  "id" varchar(36) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "code" varchar(10) COLLATE "pg_catalog"."default" NOT NULL,
  "purpose" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6) NOT NULL,
  "used" bool,
  "created_at" timestamptz(6)
)
;

-- ----------------------------
-- Records of verification_codes
-- ----------------------------
INSERT INTO "public"."verification_codes" VALUES ('7024d8f6-9239-4d11-b9f9-c074520fb482', '12702654@qq.com', '889331', 'register', '2026-03-27 09:47:31.579953+08', 't', '2026-03-27 09:42:31.590089+08');
INSERT INTO "public"."verification_codes" VALUES ('9963ea18-a31a-44a2-b39c-69d4d6a7c79b', '1178273431@qq.com', '619356', 'register', '2026-03-30 14:24:25.377718+08', 'f', '2026-03-30 14:19:25.38674+08');
INSERT INTO "public"."verification_codes" VALUES ('8ba41f62-894f-4b70-a1dd-14c15c5863b0', '231783430@qq.com', '760756', 'register', '2026-03-30 14:24:59.068788+08', 'f', '2026-03-30 14:19:59.07179+08');

-- ----------------------------
-- Indexes structure for table activity_logs
-- ----------------------------
CREATE INDEX "ix_activity_logs_user_id" ON "public"."activity_logs" USING btree (
  "user_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table activity_logs
-- ----------------------------
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table class_enrollments
-- ----------------------------
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table classes
-- ----------------------------
CREATE UNIQUE INDEX "ix_classes_invite_code" ON "public"."classes" USING btree (
  "invite_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table classes
-- ----------------------------
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table courses
-- ----------------------------
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table guest_sessions
-- ----------------------------
ALTER TABLE "public"."guest_sessions" ADD CONSTRAINT "guest_sessions_user_id_key" UNIQUE ("user_id");

-- ----------------------------
-- Primary Key structure for table guest_sessions
-- ----------------------------
ALTER TABLE "public"."guest_sessions" ADD CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table live_challenge_sessions
-- ----------------------------
CREATE INDEX "ix_live_challenge_sessions_class_id" ON "public"."live_challenge_sessions" USING btree (
  "class_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "ix_live_challenge_sessions_task_group_id" ON "public"."live_challenge_sessions" USING btree (
  "task_group_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table live_challenge_sessions
-- ----------------------------
ALTER TABLE "public"."live_challenge_sessions" ADD CONSTRAINT "live_challenge_sessions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table live_sessions
-- ----------------------------
ALTER TABLE "public"."live_sessions" ADD CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table live_submissions
-- ----------------------------
ALTER TABLE "public"."live_submissions" ADD CONSTRAINT "live_submissions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table live_task_group_submissions
-- ----------------------------
ALTER TABLE "public"."live_task_group_submissions" ADD CONSTRAINT "live_task_group_submissions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table live_task_groups
-- ----------------------------
ALTER TABLE "public"."live_task_groups" ADD CONSTRAINT "live_task_groups_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table live_tasks
-- ----------------------------
ALTER TABLE "public"."live_tasks" ADD CONSTRAINT "live_tasks_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table membership_plans
-- ----------------------------
ALTER TABLE "public"."membership_plans" ADD CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("code");

-- ----------------------------
-- Indexes structure for table notifications
-- ----------------------------
CREATE INDEX "ix_notifications_user_id" ON "public"."notifications" USING btree (
  "user_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table password_reset_tokens
-- ----------------------------
CREATE INDEX "ix_password_reset_tokens_email" ON "public"."password_reset_tokens" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "ix_password_reset_tokens_token" ON "public"."password_reset_tokens" USING btree (
  "token" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table password_reset_tokens
-- ----------------------------
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table payment_orders
-- ----------------------------
CREATE UNIQUE INDEX "ix_payment_orders_order_no" ON "public"."payment_orders" USING btree (
  "order_no" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "ix_payment_orders_teacher_id" ON "public"."payment_orders" USING btree (
  "teacher_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table payment_orders
-- ----------------------------
ALTER TABLE "public"."payment_orders" ADD CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table practice_modules
-- ----------------------------
ALTER TABLE "public"."practice_modules" ADD CONSTRAINT "practice_modules_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table student_profiles
-- ----------------------------
ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("user_id");

-- ----------------------------
-- Primary Key structure for table study_packs
-- ----------------------------
ALTER TABLE "public"."study_packs" ADD CONSTRAINT "study_packs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table submissions
-- ----------------------------
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table system_settings
-- ----------------------------
CREATE INDEX "ix_system_settings_category" ON "public"."system_settings" USING btree (
  "category" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table system_settings
-- ----------------------------
ALTER TABLE "public"."system_settings" ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");

-- ----------------------------
-- Indexes structure for table task_group_shares
-- ----------------------------
CREATE UNIQUE INDEX "ix_task_group_shares_share_token" ON "public"."task_group_shares" USING btree (
  "share_token" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table task_group_shares
-- ----------------------------
ALTER TABLE "public"."task_group_shares" ADD CONSTRAINT "task_group_shares_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table teacher_memberships
-- ----------------------------
ALTER TABLE "public"."teacher_memberships" ADD CONSTRAINT "teacher_memberships_pkey" PRIMARY KEY ("teacher_id");

-- ----------------------------
-- Primary Key structure for table teacher_profiles
-- ----------------------------
ALTER TABLE "public"."teacher_profiles" ADD CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("user_id");

-- ----------------------------
-- Indexes structure for table users
-- ----------------------------
CREATE UNIQUE INDEX "ix_users_email" ON "public"."users" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "ix_users_username" ON "public"."users" USING btree (
  "username" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table verification_codes
-- ----------------------------
CREATE INDEX "ix_verification_codes_email" ON "public"."verification_codes" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table verification_codes
-- ----------------------------
ALTER TABLE "public"."verification_codes" ADD CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table activity_logs
-- ----------------------------
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table class_enrollments
-- ----------------------------
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table classes
-- ----------------------------
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table courses
-- ----------------------------
ALTER TABLE "public"."courses" ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table guest_sessions
-- ----------------------------
ALTER TABLE "public"."guest_sessions" ADD CONSTRAINT "guest_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table live_challenge_sessions
-- ----------------------------
ALTER TABLE "public"."live_challenge_sessions" ADD CONSTRAINT "live_challenge_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_challenge_sessions" ADD CONSTRAINT "live_challenge_sessions_task_group_id_fkey" FOREIGN KEY ("task_group_id") REFERENCES "public"."live_task_groups" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table live_sessions
-- ----------------------------
ALTER TABLE "public"."live_sessions" ADD CONSTRAINT "live_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_sessions" ADD CONSTRAINT "live_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."live_task_groups" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table live_submissions
-- ----------------------------
ALTER TABLE "public"."live_submissions" ADD CONSTRAINT "live_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_submissions" ADD CONSTRAINT "live_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."live_tasks" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table live_task_group_submissions
-- ----------------------------
ALTER TABLE "public"."live_task_group_submissions" ADD CONSTRAINT "live_task_group_submissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."live_task_groups" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_task_group_submissions" ADD CONSTRAINT "live_task_group_submissions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_task_group_submissions" ADD CONSTRAINT "live_task_group_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_task_group_submissions" ADD CONSTRAINT "live_task_group_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."live_tasks" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table live_task_groups
-- ----------------------------
ALTER TABLE "public"."live_task_groups" ADD CONSTRAINT "live_task_groups_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table live_tasks
-- ----------------------------
ALTER TABLE "public"."live_tasks" ADD CONSTRAINT "live_tasks_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."live_task_groups" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."live_tasks" ADD CONSTRAINT "live_tasks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table payment_orders
-- ----------------------------
ALTER TABLE "public"."payment_orders" ADD CONSTRAINT "payment_orders_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "public"."membership_plans" ("code") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."payment_orders" ADD CONSTRAINT "payment_orders_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table practice_modules
-- ----------------------------
ALTER TABLE "public"."practice_modules" ADD CONSTRAINT "practice_modules_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "public"."study_packs" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table student_profiles
-- ----------------------------
ALTER TABLE "public"."student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table study_packs
-- ----------------------------
ALTER TABLE "public"."study_packs" ADD CONSTRAINT "study_packs_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."study_packs" ADD CONSTRAINT "study_packs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."teacher_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table submissions
-- ----------------------------
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."practice_modules" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."submissions" ADD CONSTRAINT "submissions_study_pack_id_fkey" FOREIGN KEY ("study_pack_id") REFERENCES "public"."study_packs" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table task_group_shares
-- ----------------------------
ALTER TABLE "public"."task_group_shares" ADD CONSTRAINT "task_group_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."teacher_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."task_group_shares" ADD CONSTRAINT "task_group_shares_task_group_id_fkey" FOREIGN KEY ("task_group_id") REFERENCES "public"."live_task_groups" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table teacher_memberships
-- ----------------------------
ALTER TABLE "public"."teacher_memberships" ADD CONSTRAINT "teacher_memberships_plan_code_fkey" FOREIGN KEY ("plan_code") REFERENCES "public"."membership_plans" ("code") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."teacher_memberships" ADD CONSTRAINT "teacher_memberships_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teacher_profiles" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table teacher_profiles
-- ----------------------------
ALTER TABLE "public"."teacher_profiles" ADD CONSTRAINT "teacher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
