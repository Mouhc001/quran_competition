--
-- PostgreSQL database dump
--

\restrict 99PBrJWNrcHDmGiSYyGFc79EvjROxKCUmtqTpG3Rcpu6EgPFNcNPIL4FRH7ydgm

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.admins VALUES ('0cbbec62-ec5d-4964-9cb1-731314b0232e', 'admin@competition.com', '$2a$10$pmKOySwbhYB/D3LNc.WS/.C0ty1MHiHHT0OWctDEP3mkdhc77s1wG', 'Administrateur Principal', 'admin', '2025-12-30 21:24:46.420911');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.categories VALUES ('eff2fc1d-80ad-4223-87f8-f6ef861f6924', '1 Hizb', 1, 'Mémorisation d''un Hizb', NULL, NULL, '2025-12-30 21:24:05.666058');
INSERT INTO public.categories VALUES ('0a5c093e-1fd1-40ab-ab2f-36d20569ce3a', '2 Hizb', 2, 'Mémorisation de deux Hizb', NULL, NULL, '2025-12-30 21:24:05.669167');
INSERT INTO public.categories VALUES ('98e431ec-54b8-46cd-aba9-b5e08d04c43f', '5 Hizb', 5, 'Mémorisation de cinq Hizb', NULL, NULL, '2025-12-30 21:24:05.669786');
INSERT INTO public.categories VALUES ('ccd3b722-db36-41b0-85f0-f047ea37ec76', '10 Hizb', 10, 'Mémorisation de dix Hizb', NULL, NULL, '2025-12-30 21:24:05.670331');
INSERT INTO public.categories VALUES ('a0db330d-25a5-472e-8bb7-98a0168d9587', '20 Hizb', 20, 'Mémorisation de vingt Hizb', NULL, NULL, '2025-12-30 21:24:05.670935');
INSERT INTO public.categories VALUES ('b85d45e2-8fb2-43ee-a1f4-4e392fcd22c0', '30 Hizb', 30, 'Mémorisation de trente Hizb (1/2 Coran)', NULL, NULL, '2025-12-30 21:24:05.671477');
INSERT INTO public.categories VALUES ('cd5bf72b-2ffd-476c-ad34-08edc6eb70f5', '40 Hizb', 40, 'Mémorisation de quarante Hizb', NULL, NULL, '2025-12-30 21:24:05.671986');
INSERT INTO public.categories VALUES ('5b9a1405-72b0-4812-941a-cc30498d669d', '60 Hizb', 60, 'Mémorisation complète du Coran', NULL, NULL, '2025-12-30 21:24:05.672496');


--
-- Data for Name: rounds; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.rounds VALUES ('f1defb6a-ba66-48f2-8baa-ea3df0fdf408', '1/8 ', 1, NULL, NULL, '2026-01-05 00:53:08.630342', '2026-01-05 00:53:08.630342', 'Premier tour', true);
INSERT INTO public.rounds VALUES ('c7d81a8f-a174-4ade-9e50-c7acdf86c7a3', '1/4', 2, NULL, NULL, '2026-01-05 00:58:45.929987', '2026-01-05 01:21:38.096064', '', true);


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.candidates VALUES ('74aafcce-3399-4545-92fe-31326d46664d', 'CAN001', 'Mouhcine', '2001-11-11', '097420949', 'mouhcine@test.com', 'eff2fc1d-80ad-4223-87f8-f6ef861f6924', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 'qualified', 'warsh', '2026-01-05 00:58:29.03683', '2026-01-05 00:58:29.03683', NULL, true);
INSERT INTO public.candidates VALUES ('45558c76-9ee8-4f3a-97ec-2ed3b36f7bc5', 'CAN002', 'Ahbaiz', '2002-02-22', '0943720492', 'nabil@acapessac.fr', 'eff2fc1d-80ad-4223-87f8-f6ef861f6924', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 'active', NULL, '2026-01-05 19:21:39.419046', '2026-01-05 19:21:39.419046', NULL, true);


--
-- Data for Name: judges; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.judges VALUES ('b7ae1401-45c9-4471-8e1e-0cd7080c1029', 'JURY-RRZPUW', 'testeer', 'mouhcine@test.com', false, '2025-12-31 01:00:48.935804', '2025-12-31 01:40:33.227865', '2025-12-31 01:10:38.877348');
INSERT INTO public.judges VALUES ('5b45815b-34c0-49ea-bea7-2fcbaeccedd9', 'JURY001', 'Jury 1', 'jury1@quran.com', true, '2025-12-30 21:24:05.674557', '2026-01-05 00:59:13.284941', '2025-12-31 01:10:38.877348');
INSERT INTO public.judges VALUES ('b3586358-9bec-4d03-9992-178c20e09778', 'JURY002', 'Jury 2', 'jury2@quran.com', true, '2025-12-30 21:24:05.674557', '2026-01-05 01:19:29.385877', '2025-12-31 01:10:38.877348');
INSERT INTO public.judges VALUES ('5cc711b6-af81-4e55-81f2-e38ac5c6fa5a', 'JURY-LLVTVZ', 'Mouhcine', 'mouhcine@test.com', true, '2025-12-31 00:59:41.809602', '2026-01-05 01:20:52.262254', '2025-12-31 01:10:38.877348');
INSERT INTO public.judges VALUES ('a3774150-040c-4393-ab72-c59a9b2c6eec', 'JURY003', 'Jury 3', 'jury3@quran.com', true, '2025-12-30 21:24:05.674557', '2026-01-05 01:20:58.741818', '2025-12-31 01:10:38.877348');


--
-- Data for Name: round_results; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: scores; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.scores VALUES ('fe096dec-4d4f-4df8-bdc0-e84735ec6d4f', '74aafcce-3399-4545-92fe-31326d46664d', '5b45815b-34c0-49ea-bea7-2fcbaeccedd9', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 1, 1.00, 0.00, 0.00, 0.00, 'walo', DEFAULT, '2026-01-05 01:19:08.960093');
INSERT INTO public.scores VALUES ('c652e546-665e-411e-9f7e-650e1b6a506f', '74aafcce-3399-4545-92fe-31326d46664d', '5b45815b-34c0-49ea-bea7-2fcbaeccedd9', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 2, 0.00, 0.75, 1.00, 0.00, 'ok', DEFAULT, '2026-01-05 01:19:08.972967');
INSERT INTO public.scores VALUES ('6446fa10-175e-4e68-b4db-4edfd39385c0', '74aafcce-3399-4545-92fe-31326d46664d', '5b45815b-34c0-49ea-bea7-2fcbaeccedd9', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 3, 2.00, 1.00, 2.00, 1.00, '', DEFAULT, '2026-01-05 01:19:08.973691');
INSERT INTO public.scores VALUES ('206a26c9-2ffa-4756-972b-2c4be7658b5e', '74aafcce-3399-4545-92fe-31326d46664d', '5b45815b-34c0-49ea-bea7-2fcbaeccedd9', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 4, 2.00, 1.00, 2.00, 1.00, 'Wonderful', DEFAULT, '2026-01-05 01:19:08.974445');
INSERT INTO public.scores VALUES ('2c6597df-ec60-4d75-967b-649a482ced04', '74aafcce-3399-4545-92fe-31326d46664d', '5b45815b-34c0-49ea-bea7-2fcbaeccedd9', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 5, 0.00, 0.00, 1.00, 0.00, 'walou', DEFAULT, '2026-01-05 01:19:08.975076');
INSERT INTO public.scores VALUES ('9553aff5-cf06-400f-a61c-9129d393d47e', '74aafcce-3399-4545-92fe-31326d46664d', 'b3586358-9bec-4d03-9992-178c20e09778', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 1, 2.00, 1.00, 2.00, 1.00, '', DEFAULT, '2026-01-05 01:20:19.528882');
INSERT INTO public.scores VALUES ('cd4923da-6ff7-446e-b599-4baad93c2fe7', '74aafcce-3399-4545-92fe-31326d46664d', 'b3586358-9bec-4d03-9992-178c20e09778', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 2, 2.00, 1.00, 2.00, 1.00, '', DEFAULT, '2026-01-05 01:20:19.538212');
INSERT INTO public.scores VALUES ('f369adc3-1810-4456-96ff-4a5e43c81243', '74aafcce-3399-4545-92fe-31326d46664d', 'b3586358-9bec-4d03-9992-178c20e09778', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 3, 2.00, 1.00, 2.00, 1.00, '', DEFAULT, '2026-01-05 01:20:19.540545');
INSERT INTO public.scores VALUES ('d58f308f-82ab-4334-902b-32db961e9a07', '74aafcce-3399-4545-92fe-31326d46664d', 'b3586358-9bec-4d03-9992-178c20e09778', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 4, 2.00, 0.00, 0.00, 0.00, '', DEFAULT, '2026-01-05 01:20:19.541856');
INSERT INTO public.scores VALUES ('c2eb0095-9038-4c96-a22c-a3d101bc7439', '74aafcce-3399-4545-92fe-31326d46664d', 'b3586358-9bec-4d03-9992-178c20e09778', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 5, 0.00, 0.00, 0.00, 0.50, '', DEFAULT, '2026-01-05 01:20:19.543428');
INSERT INTO public.scores VALUES ('94152d5b-82b2-4141-b4ed-cf5ab8e532e5', '74aafcce-3399-4545-92fe-31326d46664d', 'a3774150-040c-4393-ab72-c59a9b2c6eec', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 1, 0.00, 1.00, 0.00, 0.00, '', DEFAULT, '2026-01-05 01:21:16.376662');
INSERT INTO public.scores VALUES ('fe8f35d6-5315-456b-85fb-88f99cfc19e6', '74aafcce-3399-4545-92fe-31326d46664d', 'a3774150-040c-4393-ab72-c59a9b2c6eec', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 2, 0.00, 0.00, 1.00, 0.00, '', DEFAULT, '2026-01-05 01:21:16.382086');
INSERT INTO public.scores VALUES ('4ef2a668-a496-479d-a60e-5ca1400e7f3d', '74aafcce-3399-4545-92fe-31326d46664d', 'a3774150-040c-4393-ab72-c59a9b2c6eec', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 3, 0.00, 0.00, 0.00, 0.50, '', DEFAULT, '2026-01-05 01:21:16.383518');
INSERT INTO public.scores VALUES ('bd97e394-6b24-482f-8f5e-8b831d1435bb', '74aafcce-3399-4545-92fe-31326d46664d', 'a3774150-040c-4393-ab72-c59a9b2c6eec', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 4, 2.00, 0.00, 2.00, 0.00, '', DEFAULT, '2026-01-05 01:21:16.38475');
INSERT INTO public.scores VALUES ('037f39ca-c5a0-47c1-b868-85548872a91d', '74aafcce-3399-4545-92fe-31326d46664d', 'a3774150-040c-4393-ab72-c59a9b2c6eec', 'f1defb6a-ba66-48f2-8baa-ea3df0fdf408', 5, 2.00, 0.00, 2.00, 0.00, '', DEFAULT, '2026-01-05 01:21:16.385847');


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: mahbaiz
--

INSERT INTO public.system_settings VALUES ('99a741f4-9e06-4fba-9a6d-6941a84cc814', 'competition_name', 'Concours National de Récitation du Coran', 'Nom du concours', '2025-12-26 04:05:04.83951', '2025-12-26 04:05:04.83951');
INSERT INTO public.system_settings VALUES ('f6376b4d-3d65-409c-a700-ed8d335f06d5', 'current_year', '2024', 'Année du concours', '2025-12-26 04:05:04.83951', '2025-12-26 04:05:04.83951');
INSERT INTO public.system_settings VALUES ('28bbb551-3d9d-4412-b6d5-1b2f9f9a978e', 'max_judges_per_candidate', '3', 'Nombre maximum de jurys par candidat', '2025-12-26 04:05:04.83951', '2025-12-26 04:05:04.83951');
INSERT INTO public.system_settings VALUES ('0617d5c2-04fd-4cb8-9e74-62b7098f6d16', 'scoring_enabled', 'true', 'Activation du système de notation', '2025-12-26 04:05:04.83951', '2025-12-26 04:05:04.83951');
INSERT INTO public.system_settings VALUES ('3f62e3d3-cb29-4480-b1fc-1ec7b43be6d3', 'registration_open', 'true', 'Inscriptions ouvertes', '2025-12-26 04:05:04.83951', '2025-12-26 04:05:04.83951');


--
-- PostgreSQL database dump complete
--

\unrestrict 99PBrJWNrcHDmGiSYyGFc79EvjROxKCUmtqTpG3Rcpu6EgPFNcNPIL4FRH7ydgm

