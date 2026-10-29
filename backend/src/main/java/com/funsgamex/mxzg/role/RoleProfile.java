package com.funsgamex.mxzg.role;

/** Network IDs are strings; the client never needs to round a database identifier. */
public record RoleProfile(String id, String nickname, int level, long gold, long diamonds) {}
