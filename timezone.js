// UniLife OS - device timezone detection and profile sync.
// This stores only the IANA timezone name, never location coordinates.
(function () {
  const detect = () => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return typeof zone === 'string' && zone.length > 0 && zone.length <= 64
        ? zone
        : null;
    } catch (_) {
      return null;
    }
  };

  UL.timezone = {
    detect,
    async sync(user) {
      const timezone = detect();
      if (!timezone || !user || user.timezone === timezone) return { unchanged: true };
      const result = await UL.api.call('setTimezone', { timezone });
      user.timezone = result && result.timezone ? result.timezone : timezone;
      return { timezone: user.timezone, updated: true };
    }
  };
})();
