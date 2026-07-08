begin;
select plan(2);

select has_table('public', 'automation_outbox', 'outbox table exists');
select has_table('public', 'org_slack_integrations', 'slack integration table exists');

select * from finish();
rollback;
