// server/utils/communityPermissionHelper.js
// Discord-grade role hierarchy and channel permission enforcement

export const ROLE_HIERARCHY_LEVELS = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

/**
 * Determine the highest role level of a user within a community.
 */
export const getMemberHighestRole = (community, userId) => {
  if (!community || !userId) return null;
  const uid = String(userId?._id || userId);
  const ownerId = String(community.owner?._id || community.owner);
  if (ownerId === uid) return "owner";

  const member = community.members?.find(
    (m) => String(m.user?._id || m.user) === uid
  );
  if (!member) return null;

  const roles = member.roles || [];
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("moderator")) return "moderator";
  return "member";
};

/**
 * Checks whether a user can access a channel (read history, send messages, connect voice).
 * Private channels require:
 * - Community ownership OR admin role OR inclusion in channel.allowedRoles
 */
export const canAccessChannel = (community, channel, userId) => {
  if (!channel || !community) return false;
  if (!userId) return false;

  const uid = String(userId?._id || userId);
  const ownerId = String(community.owner?._id || community.owner);
  if (ownerId === uid) return true;

  const member = community.members?.find(
    (m) => String(m.user?._id || m.user) === uid
  );
  if (!member) return false;

  if (!channel.isPrivate) return true;

  const roles = member.roles || [];
  if (roles.includes("owner") || roles.includes("admin")) return true;

  if (Array.isArray(channel.allowedRoles) && channel.allowedRoles.length > 0) {
    return channel.allowedRoles.some((r) => roles.includes(r));
  }

  return false;
};

/**
 * Checks whether caller strictly outranks target according to role hierarchy.
 * Admins cannot moderate/kick other Admins or Owner.
 * Moderators cannot moderate/kick other Moderators, Admins, or Owner.
 */
export const canManageTargetMember = (community, callerUserId, targetUserId) => {
  if (!community || !callerUserId || !targetUserId) return false;
  const callerUid = String(callerUserId?._id || callerUserId);
  const targetUid = String(targetUserId?._id || targetUserId);

  if (callerUid === targetUid) return false; // Cannot kick/moderate self

  const callerRole = getMemberHighestRole(community, callerUid);
  const targetRole = getMemberHighestRole(community, targetUid);

  if (!callerRole || !targetRole) return false;

  const callerLevel = ROLE_HIERARCHY_LEVELS[callerRole] || 0;
  const targetLevel = ROLE_HIERARCHY_LEVELS[targetRole] || 0;

  return callerLevel > targetLevel;
};
