create table if not exists convs (
	id binary (12) not null,
	user1_id binary (12) not null,
    user2_id binary (12) not null,
	started_at datetime not null default current_timestamp(),
    /* This will just be 1 or 2 so that we can just use the id of appropriate user. */
    started_by tinyint(1) not null,
    last_message binary (12) null,
    last_seen_by_user1 datetime,
    last_seen_by_user2 datetime,
    num_msgs bigint unsigned default 0,


	primary key (id),
	foreign key (user1_id) references users (id),
    foreign key (user2_id) references users (id),
    index idx_id (id),
    index users (user1_id, user2_id)
);

create table if not exists msg (
    id binary(12) not null,
    conv_id binary (12) not null,
    sender_id binary (12) not null,
    receiver_id binary (12) not null,
    sent_at datetime not null default current_timestamp(),
    seen boolean not null default false,
    seen_at datetime,
    body text,
    
    primary key (id),
    foreign key (conv_id) references convs (id),
    foreign key (sender_id) references users (id),
    foreign key (receiver_id) references users (id),
    index idx_conv_id (conv_id),
    index idx_id (id)
);

alter table convs
add constraint last_msg_const
foreign key (last_message) references msg (id);