begin;
select plan(2);

select has_table('public', 'org_google_integrations', 'google org config exists');
select has_table('public', 'user_google_tokens', 'google user tokens exists');

select * from finish();
rollback;
