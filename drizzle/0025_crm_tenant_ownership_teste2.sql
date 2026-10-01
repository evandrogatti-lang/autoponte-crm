-- AP-CRM-003D1D. Staging-only policy assignment; never run on Production.
-- Historical Tenant Core 0023/0024 are already deployed and must not be replayed.
begin;
lock table public.customers, public.buyer_profiles, public.trade_ins, public.commercial_cases in access exclusive mode;
create temporary table ap_manifest (root text, id text, business_hash text, primary key(root,id)) on commit drop;
insert into ap_manifest values
('customers','afd1a366-6945-4934-96d9-8c974727e7c5','4de8fdeb8a311b37ebd32e55997be160'),
('customers','phase2-p2-01-customer','e3df1baa905f706c12e12eb18822dc1c'),
('customers','phase2-p2-02-customer','2f1da045732b22c0ccebcfe65c682b82'),
('customers','phase2-p2-03-customer','d97e6446ed724cc11a1fe8827987a51d'),
('customers','phase2-p2-04-customer','d412abb1fcb5c3dedbbe6605af4a68b8'),
('customers','phase2-p2-05-customer','574361a2cca6ab9de79a8d90843778f5'),
('customers','phase2-p2-06-customer','7a4deb57a79c72644b22013f8918a455'),
('customers','phase2-p2-07-customer','233b2692eafcbb6477c4d2bed079b700'),
('customers','phase2-p2-08-customer','ddd70f9b3a0e6d1f7f321a13b9402d65'),
('customers','phase2-p2-09-customer','cd0d6357f7ae02277dd5297a18e418e1'),
('customers','phase2-p2-10-customer','2e6c9d83bfe6d2fbbea16ef4d9892832'),
('customers','phase2-p2-11-customer','0e4f1e4c5b72612b8f9f761b12f045d1'),
('customers','phase2-p2-12-customer','7aec90b46abd0d89bd8b441aeff20220'),
('customers','phase2-p2-13-customer','125dddfdc782a868ad7aa851c179663d'),
('customers','phase2-p2-14-customer','44960bbf5ee08af72197ad74a138a128'),
('customers','phase2-p2-15-customer','0cd6615a2b59dc384bb15ac4589d27e6'),
('customers','phase2-p2-16-customer','0cd954adcddd63df7590db63a3f18a7f'),
('customers','phase2-p2-17-customer','9cfd0f022cf5725964a7b0a92a11d975'),
('customers','phase2-p2-18-customer','fb9b12708d6f1b3e67a741d3b9732aa0'),
('customers','phase2-p2-19-customer','c3354626206a72e01989f934a0ac4a17'),
('customers','phase2-p2-20-customer','ee77a2400f668fe5b8924401c42e074e'),
('customers','phase2-p2-21-customer','b807822553d4d2a85973f9917b718cf5'),
('customers','phase2-p2-22-customer','b1d307ad3b3bc29442abe3e4a1433e08'),
('customers','phase2-p2-23-customer','b4cd4a1c757fb03226cafc32736a46e2'),
('customers','phase2-p2-24-customer','b796844fb62533e236692de650da9c77'),
('customers','phase2-p2-25-customer','ee455fc51e9ccad65dc60ed0519e5a56'),
('customers','phase2-p2-26-customer','721525a6209cdc5ac4d6ada04f435d9d'),
('customers','phase2-p2-27-customer','7d68a8603242e9eee9b3c4f71b4ef9d0'),
('customers','phase2-p2-28-customer','60aff231e3391b86bd665bea02a8b82e'),
('customers','phase2-p2-29-customer','4ef969390b8efbc2e714c579c414d308'),
('customers','phase2-p2-30-customer','6d57f78d0ed14a7c077ec03f72b5a9a3'),
('customers','phase2-p2-31-customer','8fd51a05327d148cc42475614de230fc'),
('customers','phase2-p2-32-customer','444153f3dc5a3d1134ba5790378397da'),
('customers','phase2-p2-33-customer','5b8bfe846e1d3fe69e570f008d051562'),
('customers','phase2-p2-34-customer','56ebee027b118cfb53c3ceff47057f15'),
('customers','phase2-p2-35-customer','68f0734fad33762f9bab6bc13065eeff'),
('customers','phase2-p2-36-customer','aa464be15025ac30c424d76ef1e5477b'),
('customers','phase2-p2-37-customer','3efca8e2770ce11b18e3fe4a0e866e9b'),
('customers','phase2-p2-38-customer','ae19ab1ebe67a2fb593993e9f3ce6336'),
('customers','phase2-p2-39-customer','d62e240ca7e42a54b352e2b5e4e0a3dc'),
('customers','phase2-p2-40-customer','4687dff066fe3ead46bb0dbc7b8708e6'),
('customers','pilot-p1-01-customer','32d2bf3d591a5bb6c1ede3edb53ddcbd'),
('customers','pilot-p1-02-customer','73697f91eb6cdf80d285b1fe70b852cd'),
('customers','pilot-p1-03-customer','08ccb95e52bba42f41545c9631fae109'),
('customers','pilot-p1-04-customer','4edd1c219c43866d5b4233752671233b'),
('customers','pilot-p1-05-customer','9535d69ba58fe3a429d505c8c22f3f4d'),
('customers','pilot-p1-06-customer','76ce38b2f29b28a1ace67ef75beb7d22'),
('customers','pilot-p1-07-customer','ecdb33e725706495790affa03d494e99'),
('customers','pilot-p1-08-customer','86cfd6274dd5af8db3cac65339bdc912'),
('customers','pilot-p1-09-customer','388e6a81b69a83f0be429e32ca3737b1'),
('customers','pilot-p1-10-customer','d1582b064b55edd2dc29f76b9f631cc0'),
('trade_ins','2ecab4d7-9b16-452d-854c-4dc7057d295e','e02a5b1a69ff90d239ae3ec7dc572a28'),
('trade_ins','phase2-p2-01-opportunity','4b2a1cb1a3ad9e6b9ecd15d9017d1bc8'),
('trade_ins','phase2-p2-02-opportunity','d663a082d23ddd50c5d45cab9194febc'),
('trade_ins','phase2-p2-03-opportunity','de3dc82fbbe1a969355420ee2cb7c3c4'),
('trade_ins','phase2-p2-04-opportunity','9e649fb65639929eee0cc1732ce21545'),
('trade_ins','phase2-p2-05-opportunity','b732a51cd49c0537cf3e8d636395596c'),
('trade_ins','phase2-p2-06-opportunity','cda9db94bb3b261d8ec7e101bd759b11'),
('trade_ins','phase2-p2-07-opportunity','716592f98db040db2187adfb7b485c4b'),
('trade_ins','phase2-p2-08-opportunity','98bce1dabf1d25a76621b18ccf1c3731'),
('trade_ins','phase2-p2-09-opportunity','b956a8b3748efeede0cf3536bb9d3415'),
('trade_ins','phase2-p2-10-opportunity','17d4fabbbb4750c5cdab0c32b0808dcb'),
('trade_ins','phase2-p2-11-opportunity','6bc8ab66723aedb77a559dec7935c465'),
('trade_ins','phase2-p2-12-opportunity','3649fd60c71871f3962cd1425548f9c6'),
('trade_ins','phase2-p2-13-opportunity','1b1e53b38c1dc64967656ffcbc27773a'),
('trade_ins','phase2-p2-14-opportunity','01a34d1be7532eff4d47b6b2a48ceae7'),
('trade_ins','phase2-p2-15-opportunity','a16c57dc4476bd2d3eb981187efa4efd'),
('trade_ins','phase2-p2-16-opportunity','a783c57abace2a9ec45fcb67150af3c1'),
('trade_ins','phase2-p2-17-opportunity','355cfab9e5752d193b4dc882223dc514'),
('trade_ins','phase2-p2-18-opportunity','18e5e20f3959fb27c6c8af97a706880e'),
('trade_ins','phase2-p2-19-opportunity','00c36f50a0b5502c5480b107eeae0783'),
('trade_ins','phase2-p2-20-opportunity','cc8b19031dd4dd85a31bef3982e65155'),
('trade_ins','phase2-p2-21-opportunity','c6988d210fd69c18ba5caa97b99d9a89'),
('trade_ins','phase2-p2-22-opportunity','26f8b0ac831fbb2a70345131d8f4f448'),
('trade_ins','phase2-p2-23-opportunity','3603da6ba79ae8a7b59633faf17d7e40'),
('trade_ins','phase2-p2-24-opportunity','0e12a48060c0b1352843582839320de9'),
('trade_ins','phase2-p2-25-opportunity','09fe580f2eeed6084a2698c5b1ac7989'),
('trade_ins','phase2-p2-26-opportunity','3d53344f9ecf807319c976b13447012e'),
('trade_ins','phase2-p2-27-opportunity','9de9b9603383041846e92cce2c80214b'),
('trade_ins','phase2-p2-28-opportunity','c28e0cc7963434357c86994803002931'),
('trade_ins','phase2-p2-29-opportunity','b4c4d08e3cbbb9979300c01b0eff5405'),
('trade_ins','phase2-p2-30-opportunity','dd06508ebdd98fb4cf013e9e104bfd60'),
('trade_ins','phase2-p2-31-opportunity','0395f7535fd27cf243a36b4e69577d13'),
('trade_ins','phase2-p2-32-opportunity','5b0f092d2be357a9d60651e2bb3b6b3b'),
('trade_ins','phase2-p2-33-opportunity','7330d282a3197f697df20754dde3258e'),
('trade_ins','phase2-p2-34-opportunity','26de940e6a3fb8309d9f6677548b3fe6'),
('trade_ins','phase2-p2-35-opportunity','3555791c84c21960ab049f3da5711703'),
('trade_ins','phase2-p2-36-opportunity','802db43277313430ab1aef651d6b6b3c'),
('trade_ins','phase2-p2-37-opportunity','0f11bfaa3885ec34a954688383e2c877'),
('trade_ins','phase2-p2-38-opportunity','513f664c123eab30d5318d41c02efd24'),
('trade_ins','phase2-p2-39-opportunity','f131db705d148d4f18bd77306c67ddd1'),
('trade_ins','phase2-p2-40-opportunity','deb9149e14e32c4e7ad5909773c8afa2'),
('trade_ins','pilot-p1-01-opportunity','dc186b47f30718a26550336a44d0f533'),
('trade_ins','pilot-p1-02-opportunity','26e14fe43baffeb4ddf7555ff8fdd933'),
('trade_ins','pilot-p1-03-opportunity','b0c28eb8e37838eb96c0f7e168dc76b9'),
('trade_ins','pilot-p1-04-opportunity','500421a0749c8f6f1cf7151af41626e9'),
('trade_ins','pilot-p1-05-opportunity','0b8af2628e3de2ec2d237c6dbf4e82d6'),
('trade_ins','pilot-p1-06-opportunity','731b168da6950c01bb2d9c2444da3341'),
('trade_ins','pilot-p1-07-opportunity','8ee67e77980ef7196d94bcad004d0357'),
('trade_ins','pilot-p1-08-opportunity','8e4c102eb9a051c284ea8705bd375f8d'),
('trade_ins','pilot-p1-09-opportunity','fae873f4207e23dd2de1d9b2ca4b21a2'),
('trade_ins','pilot-p1-10-opportunity','0a2e7ebfd00f718c79d2adf774f74ef1'),
('buyer_profiles','ee463da0-0e67-4358-9b0a-93b6ac194f34','e7a9892968255572622ba39891a31d4b'),
('buyer_profiles','phase2-p2-01-buyer','31d9a5cf08a198b88bb45585d4fa23f7'),
('buyer_profiles','phase2-p2-02-buyer','4713acfcc1a63d51afa0b540d9b7bc60'),
('buyer_profiles','phase2-p2-03-buyer','cca91636b84b216c0a261c1e4c6502a2'),
('buyer_profiles','phase2-p2-04-buyer','df76bb98197311cb13d0a1b7663da531'),
('buyer_profiles','phase2-p2-05-buyer','dd93aee6dcfe7bc92a53f85b13fa4db6'),
('buyer_profiles','phase2-p2-06-buyer','dcb8ec63f30663b5971dc77a5ec544c7'),
('buyer_profiles','phase2-p2-07-buyer','adfd60f509e500a7944c5f454e7b52ba'),
('buyer_profiles','phase2-p2-08-buyer','9f233d485fcbff71d61310e29429daac'),
('buyer_profiles','phase2-p2-09-buyer','20be8e82c7949aaf0f014dd02058b347'),
('buyer_profiles','phase2-p2-10-buyer','55dadbec324ccc1b5d48e8a5179ebf58'),
('buyer_profiles','phase2-p2-11-buyer','540827f9e1a2382881fda117d35cc107'),
('buyer_profiles','phase2-p2-12-buyer','2f561ca6cf1896dae61d7f7ec0168e81'),
('buyer_profiles','phase2-p2-13-buyer','9884db59576366ede93960367c62b9a5'),
('buyer_profiles','phase2-p2-14-buyer','ceb2f4643ea2e452736fe68bfd367f29'),
('buyer_profiles','phase2-p2-15-buyer','7719064385ebe76ff12ac140e8b15b5b'),
('buyer_profiles','phase2-p2-16-buyer','63362e96659357cdf078d506284e9d2e'),
('buyer_profiles','phase2-p2-17-buyer','805b19bf07c10f676d7bafe0004fdc44'),
('buyer_profiles','phase2-p2-18-buyer','e935fd169da0fde03b4d64edb4b12bd2'),
('buyer_profiles','phase2-p2-19-buyer','da4284dbad57b3cac1da6fc0cf059ead'),
('buyer_profiles','phase2-p2-20-buyer','d2068862bd8918af3d4e57b2fd347abc'),
('buyer_profiles','phase2-p2-21-buyer','5a33a85824df68fd65b18aee9cbcf3e6'),
('buyer_profiles','phase2-p2-22-buyer','a30b2c6645680955651888868f06ee38'),
('buyer_profiles','phase2-p2-23-buyer','5d3e245769d23490627d9d5a90b7667d'),
('buyer_profiles','phase2-p2-24-buyer','0229b7b01cff43203b5c757fd7e38cba'),
('buyer_profiles','phase2-p2-25-buyer','4bfbf898d773c25f50e14f27659a0e13'),
('buyer_profiles','phase2-p2-26-buyer','d4f21b41e3d53b4fc5e35946c6149eff'),
('buyer_profiles','phase2-p2-27-buyer','3f50722beea6aebab432b2efdbbc04d5'),
('buyer_profiles','phase2-p2-28-buyer','58a4e33d8ded723512e5ea54867a9351'),
('buyer_profiles','phase2-p2-29-buyer','45e7549d88b04a20c495c0c49ce68ece'),
('buyer_profiles','phase2-p2-30-buyer','b7fb4ca1ca02f07c21f53316fb9817dc'),
('buyer_profiles','phase2-p2-31-buyer','f96bd5222df5abeec4ce7712ee9ab2c2'),
('buyer_profiles','phase2-p2-32-buyer','fc7ba5d1c58bbe2c6b67a22bd2deda65'),
('buyer_profiles','phase2-p2-33-buyer','0603122a18655766ee776da1e0d54f0e'),
('buyer_profiles','phase2-p2-34-buyer','f97142e470911256072f57eff014a44e'),
('buyer_profiles','phase2-p2-35-buyer','3eb87f71d0ad600c14803c6fa59025d4'),
('buyer_profiles','phase2-p2-36-buyer','fa4b0c80ff30240b2673c5daabf6a2b1'),
('buyer_profiles','phase2-p2-37-buyer','ed8b05be0843c00f0de0f30134445a87'),
('buyer_profiles','phase2-p2-38-buyer','7eea1745394799c5554601686232835a'),
('buyer_profiles','phase2-p2-39-buyer','2f4a8c84b7745f9db552d9b204bd8aa8'),
('buyer_profiles','phase2-p2-40-buyer','905092a1371dc09363c62e0c17b95b44'),
('buyer_profiles','pilot-p1-01-buyer','bbdf6ba6a89090bb3b6f7fb29dd32ed7'),
('buyer_profiles','pilot-p1-02-buyer','38600cf3eb21d9baf01aacd3abc857ec'),
('buyer_profiles','pilot-p1-03-buyer','6d506e3518012e5a9a82910521506763'),
('buyer_profiles','pilot-p1-04-buyer','c70359ed430b1a30937dbdac1c630c5c'),
('buyer_profiles','pilot-p1-05-buyer','67f8edb5db688316c0407f1b5ce5134e'),
('buyer_profiles','pilot-p1-06-buyer','36c0dbdd23311315727f87805bdaea45'),
('buyer_profiles','pilot-p1-07-buyer','ecc02e46781a1d06346d9280193a73cf'),
('buyer_profiles','pilot-p1-08-buyer','c1587acb91b3140deb1278dee3b69209'),
('buyer_profiles','pilot-p1-09-buyer','e85493c2b9a9634b762d8099ef1a5f75'),
('buyer_profiles','pilot-p1-10-buyer','378c46046783ef721359ebea4a936596'),
('commercial_cases','3ed2fe56-0103-4efe-9d67-b11796136afd','398929abb4349b87a39c4c1f96575b14'),
('commercial_cases','phase2-p2-01-case','7c4355bc1c879a3b07cadf9f946278bf'),
('commercial_cases','phase2-p2-02-case','3cda24a3d154e88b873e224e2ba7d3e7'),
('commercial_cases','phase2-p2-03-case','908720b811308a0bc6bafd0678b95389'),
('commercial_cases','phase2-p2-04-case','7c483d99066f21ee9a9506e2837f0fc5'),
('commercial_cases','phase2-p2-05-case','ca5c4a697cea62b2cc77a05da69283fd'),
('commercial_cases','phase2-p2-06-case','d2e8f982010b6c46652ed49dbc19f603'),
('commercial_cases','phase2-p2-07-case','2ec4a7550563a2c0d9af60662d33e437'),
('commercial_cases','phase2-p2-08-case','bc0f08bfd9fb9a9657f7fbd7ad7d6bee'),
('commercial_cases','phase2-p2-09-case','c2760ad95b1035726249002ecb6559a9'),
('commercial_cases','phase2-p2-10-case','80874f80da06b614fe95fdcb295cde7c'),
('commercial_cases','phase2-p2-11-case','84f1e2227c406549677f7f778ac3792a'),
('commercial_cases','phase2-p2-12-case','a57816314ef1643e306c41ca03946928'),
('commercial_cases','phase2-p2-13-case','fe83325bf6c6d29ba86242f5c64dfbec'),
('commercial_cases','phase2-p2-14-case','6ca84a241c0d41d10ad2e22c94bbf49e'),
('commercial_cases','phase2-p2-15-case','a844e54946f4089b546612447b8f2418'),
('commercial_cases','phase2-p2-16-case','29641965638c95d0e405bccff054db15'),
('commercial_cases','phase2-p2-17-case','9654c854cd3c45c301432bd25c8a0227'),
('commercial_cases','phase2-p2-18-case','7a083965ca298da2480aa627c3985a02'),
('commercial_cases','phase2-p2-19-case','220470aa37a0a5a95f6d7d72e7179a90'),
('commercial_cases','phase2-p2-20-case','ed7f218eb2d619e03ca46421cf9bc09f'),
('commercial_cases','phase2-p2-21-case','b0913206f83977734101a5560e2edb7d'),
('commercial_cases','phase2-p2-22-case','a5d524565f84e31c3ebaa86505695ac9'),
('commercial_cases','phase2-p2-23-case','2780f1965e6b743b2367ccf5cddc6f57'),
('commercial_cases','phase2-p2-24-case','8295e8ff801da215a4b8893e1b60609b'),
('commercial_cases','phase2-p2-25-case','9442988bf1d6511b40de32d7ded3db9c'),
('commercial_cases','phase2-p2-26-case','0b695343f06ceb120a47718e799eb788'),
('commercial_cases','phase2-p2-27-case','92ff138d38098daae83cd8caf00d5288'),
('commercial_cases','phase2-p2-28-case','b0208a7ed5ef458ced7045823e4e9171'),
('commercial_cases','phase2-p2-29-case','9aef6caa06d084b88c12403948364f5d'),
('commercial_cases','phase2-p2-30-case','f6ccfeedbc660c897b4d128434915d16'),
('commercial_cases','phase2-p2-31-case','4388cc2eb68c1e62857dd77034cbb608'),
('commercial_cases','phase2-p2-32-case','4830387181f214fcf443b8653446a453'),
('commercial_cases','phase2-p2-33-case','90199016c675c2ef2e6e0c50a8c67b9a'),
('commercial_cases','phase2-p2-34-case','411b8694a2a7c521405121c45bb2cdf2'),
('commercial_cases','phase2-p2-35-case','a4bc4aa9b5795944acf9e17831ac634d'),
('commercial_cases','phase2-p2-36-case','42777d49e7a9b2a4fc8d56104732b6f4'),
('commercial_cases','phase2-p2-37-case','c0982bdaa9a9c2340da98886c7d50811'),
('commercial_cases','phase2-p2-38-case','a0f9c1130e6d10511077fb280cbb0d0c'),
('commercial_cases','phase2-p2-39-case','f4074ec1763b7ccb785f984ec1759c28'),
('commercial_cases','phase2-p2-40-case','ca4c9fba7ec2b3e8f517b6c907f26de3'),
('commercial_cases','pilot-p1-01','12c1d072919fcca6a459d8c5e061a115'),
('commercial_cases','pilot-p1-02','befb996cc5f9998eb3d5e6af11f7dad8'),
('commercial_cases','pilot-p1-03','a85b419db9d7926718ee669697ec3a42'),
('commercial_cases','pilot-p1-04','f7a010e707e0117d7cdcf270ee45fc49'),
('commercial_cases','pilot-p1-05','74fe537748a169b91b347713e31c7707'),
('commercial_cases','pilot-p1-06','99cc3568b64da0c6d49242a7a30c88ed'),
('commercial_cases','pilot-p1-07','06872b7cd66275adeb8266f259d7047a'),
('commercial_cases','pilot-p1-08','e348e0ccb6854e8a08ecdc8595e53444'),
('commercial_cases','pilot-p1-09','bef4d4219b304cb816eba953ed4bf81b'),
('commercial_cases','pilot-p1-10','1cb2dd8f5c3d2cb83702fd8f3c3fb8db');
do $$ begin
if not exists(select 1 from tenants where id='03824f9e-0924-435e-8b20-50b8ea52774b' and name='AutoPonte Homologação — Tenant Core' and status='active') or not exists(select 1 from tenants where id='54fb9ae6-9b5e-4e82-8fc2-b01848a288d9' and name='AutoPonte QA RLS Policy 1 — Other Tenant' and status='active') then raise exception 'Tenant identity drift'; end if;
end $$;
do $$ begin
if (select count(*) from public.customers) <> 51 or exists(select 1 from public.customers r full join (select * from ap_manifest where root='customers') m on m.id=r.id where r.id is null or m.id is null or md5(to_jsonb(r)::text) <> m.business_hash) then raise exception 'customers manifest/before-state drift'; end if;
end $$;
alter table public.customers add column tenant_id uuid references public.tenants(id) on delete restrict;
do $$ begin
if (select count(*) from public.trade_ins) <> 51 or exists(select 1 from public.trade_ins r full join (select * from ap_manifest where root='trade_ins') m on m.id=r.id where r.id is null or m.id is null or md5(to_jsonb(r)::text) <> m.business_hash) then raise exception 'trade_ins manifest/before-state drift'; end if;
end $$;
alter table public.trade_ins add column tenant_id uuid references public.tenants(id) on delete restrict;
do $$ begin
if (select count(*) from public.buyer_profiles) <> 51 or exists(select 1 from public.buyer_profiles r full join (select * from ap_manifest where root='buyer_profiles') m on m.id=r.id where r.id is null or m.id is null or md5(to_jsonb(r)::text) <> m.business_hash) then raise exception 'buyer_profiles manifest/before-state drift'; end if;
end $$;
alter table public.buyer_profiles add column tenant_id uuid references public.tenants(id) on delete restrict;
do $$ begin
if (select count(*) from public.commercial_cases) <> 51 or exists(select 1 from public.commercial_cases r full join (select * from ap_manifest where root='commercial_cases') m on m.id=r.id where r.id is null or m.id is null or md5(to_jsonb(r)::text) <> m.business_hash) then raise exception 'commercial_cases manifest/before-state drift'; end if;
end $$;
alter table public.commercial_cases add column tenant_id uuid references public.tenants(id) on delete restrict;
do $$ begin
if exists(select 1 from commercial_cases c where
(c.id like 'pilot-p1-%' and (c.customer_id is distinct from c.id||'-customer' or c.opportunity_id is distinct from c.id||'-opportunity' or not exists(select 1 from buyer_profiles b where b.id=c.id||'-buyer')))
or (c.id like 'phase2-p2-%' and (c.customer_id is distinct from replace(c.id,'-case','-customer') or c.opportunity_id is distinct from replace(c.id,'-case','-opportunity') or not exists(select 1 from buyer_profiles b where b.id=replace(c.id,'-case','-buyer'))))
or (c.id='3ed2fe56-0103-4efe-9d67-b11796136afd' and (c.customer_id is distinct from 'afd1a366-6945-4934-96d9-8c974727e7c5' or c.opportunity_id is distinct from '2ecab4d7-9b16-452d-854c-4dc7057d295e' or not exists(select 1 from customer_intents i where i.case_id=c.id and i.customer_id=c.customer_id and i.buyer_profile_id='ee463da0-0e67-4358-9b0a-93b6ac194f34')))) then raise exception 'Fixture relationship drift'; end if;
end $$;
update public.customers r set tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b' from ap_manifest m where m.root='customers' and m.id=r.id and r.tenant_id is null;
do $$ begin if (select count(*) from public.customers where tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b') <> 51 or exists(select 1 from public.customers r join ap_manifest m on m.root='customers' and m.id=r.id where md5((to_jsonb(r)-'tenant_id')::text) <> m.business_hash) then raise exception 'customers assignment/business field validation failed'; end if; end $$;
update public.trade_ins r set tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b' from ap_manifest m where m.root='trade_ins' and m.id=r.id and r.tenant_id is null;
do $$ begin if (select count(*) from public.trade_ins where tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b') <> 51 or exists(select 1 from public.trade_ins r join ap_manifest m on m.root='trade_ins' and m.id=r.id where md5((to_jsonb(r)-'tenant_id')::text) <> m.business_hash) then raise exception 'trade_ins assignment/business field validation failed'; end if; end $$;
update public.buyer_profiles r set tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b' from ap_manifest m where m.root='buyer_profiles' and m.id=r.id and r.tenant_id is null;
do $$ begin if (select count(*) from public.buyer_profiles where tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b') <> 51 or exists(select 1 from public.buyer_profiles r join ap_manifest m on m.root='buyer_profiles' and m.id=r.id where md5((to_jsonb(r)-'tenant_id')::text) <> m.business_hash) then raise exception 'buyer_profiles assignment/business field validation failed'; end if; end $$;
update public.commercial_cases r set tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b' from ap_manifest m where m.root='commercial_cases' and m.id=r.id and r.tenant_id is null;
do $$ begin if (select count(*) from public.commercial_cases where tenant_id='03824f9e-0924-435e-8b20-50b8ea52774b') <> 51 or exists(select 1 from public.commercial_cases r join ap_manifest m on m.root='commercial_cases' and m.id=r.id where md5((to_jsonb(r)-'tenant_id')::text) <> m.business_hash) then raise exception 'commercial_cases assignment/business field validation failed'; end if; end $$;
alter table customers add constraint customers_tenant_id_id_key unique(tenant_id,id);
alter table trade_ins add constraint trade_ins_tenant_id_id_key unique(tenant_id,id);
alter table commercial_cases add constraint commercial_cases_customer_same_tenant_fkey foreign key(tenant_id,customer_id) references customers(tenant_id,id) on delete restrict;
alter table commercial_cases add constraint commercial_cases_lead_same_tenant_fkey foreign key(tenant_id,opportunity_id) references trade_ins(tenant_id,id) on delete restrict;
alter table public.customers alter column tenant_id set not null;
alter table public.trade_ins alter column tenant_id set not null;
alter table public.buyer_profiles alter column tenant_id set not null;
alter table public.commercial_cases alter column tenant_id set not null;
create table public.intake_routes (
route_key text primary key,
intake_kind text not null check(intake_kind in ('buyer_profile','trade_in')),
tenant_id uuid not null references public.tenants(id) on delete restrict,
store_id uuid,
status text not null check(status in ('active','inactive')),
created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
constraint intake_routes_store_same_tenant_fkey foreign key(tenant_id,store_id) references public.stores(tenant_id,id) on delete restrict
);
alter table public.intake_routes enable row level security;
revoke all on public.intake_routes from anon,authenticated,public;
insert into public.intake_routes(route_key,intake_kind,tenant_id,store_id,status) values
('public_buyer_profile','buyer_profile','03824f9e-0924-435e-8b20-50b8ea52774b',null,'active'),
('public_trade_in','trade_in','03824f9e-0924-435e-8b20-50b8ea52774b',null,'active');
commit;
