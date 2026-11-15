import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { addDays, weekdayOf, zonedTimeToUtc } from '../../common/utilities/time-zone.js';
import { BusinessesService, type BusinessMembership } from '../businesses/index.js';
import { ProfessionalsService } from '../professionals/index.js';
import type {
    DashboardBucketDto,
    DashboardHeatmapResponseDto,
    DashboardInactiveCustomersResponseDto,
    DashboardOccupancyDto,
    DashboardOccupancyResponseDto,
    DashboardInterval,
    DashboardMetricsDto,
    DashboardPaymentMethodsResponseDto,
    DashboardPeriodDto,
    DashboardProfessionalItemDto,
    DashboardProfessionalsResponseDto,
    DashboardRangeQueryDto,
    DashboardScope,
    DashboardScopeQueryDto,
    DashboardServicesResponseDto,
    DashboardSummaryQueryDto,
    DashboardSummaryResponseDto,
    DashboardTimeseriesQueryDto,
    DashboardTimeseriesResponseDto,
} from './dto/dashboard.dto.js';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MAX_PERIOD_DAYS = 366;
const DAILY_MAX_DAYS = 62;
const WEEKLY_MAX_DAYS = 200;
const INACTIVE_AFTER_DAYS = 60;
const INACTIVE_LIST_SIZE = 10;

type Scope = { scope: DashboardScope; professionalId: string | null };

type Range = { start: Date; end: Date };

type NumericRow = Record<string, string | number | null>;

type WorkingHoursRow = { professionalId: string; dayOfWeek: number; startTime: string | null; endTime: string | null; isDayOff: boolean };

type TimeOffRow = { professionalId: string; startAt: Date | string; endAt: Date | string };

type OccupancyMinutes = { booked: number; available: number };

const IN_SCOPE = `
    FROM appointments a
    JOIN customers c ON c.id = a."customerId"
    WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2)`;

const PAID_IN_SCOPE = `
    FROM payments p
    JOIN appointments a ON a.id = p."appointmentId"
    JOIN customers c ON c.id = a."customerId"
    WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2) AND p.status = 'paid'`;

const REVIEWS_IN_SCOPE = `
    FROM reviews r
    WHERE r."businessId" = $1 AND ($2::uuid IS NULL OR r."professionalId" = $2)`;

const LINE_COMMISSION = `(SELECT coalesce(sum(s."commissionAmount"), 0) FROM appointment_services s WHERE s."appointmentId" = a.id)`;

const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);
const roundTo = (value: number, digits: number): number => Math.round(value * 10 ** digits) / 10 ** digits;
const ratio = (part: number, whole: number, digits = 4): number | null => (whole > 0 ? roundTo(part / whole, digits) : null);
const daysBetween = (from: string, to: string): number => (Date.parse(to) - Date.parse(from)) / DAY_MS;

@Injectable()
export class DashboardService {

    constructor(
        private readonly dataSource: DataSource,
        private readonly businesses: BusinessesService,
        private readonly professionals: ProfessionalsService,
    ) { }

    async summary(businessId: string, actor: BusinessMembership, query: DashboardSummaryQueryDto): Promise<DashboardSummaryResponseDto> {
        DashboardService.ensurePeriod(query.from, query.to, 'to');
        const comparison = DashboardService.comparisonOf(query);
        const [scope, business] = await Promise.all([this.resolveScope(businessId, actor, query.professionalId), this.businesses.getById(businessId)]);
        const params = [businessId, scope.professionalId];

        const [current, previous, hasCompleted] = await Promise.all([
            this.metrics(params, DashboardService.rangeOf(query, business.timezone)),
            this.metrics(params, DashboardService.rangeOf(comparison, business.timezone)),
            this.dataSource.query(`SELECT EXISTS (SELECT 1 ${IN_SCOPE} AND a.status = 'completed') AS "exists"`, params) as Promise<{ exists: boolean }[]>,
        ]);
        return {
            ...scope,
            hasCompletedAppointments: Boolean(hasCompleted[0]?.exists),
            period: { from: query.from, to: query.to },
            comparison,
            current,
            previous,
        };
    }

    async timeseries(businessId: string, actor: BusinessMembership, query: DashboardTimeseriesQueryDto): Promise<DashboardTimeseriesResponseDto> {
        DashboardService.ensurePeriod(query.from, query.to, 'to');
        const [scope, business] = await Promise.all([this.resolveScope(businessId, actor, query.professionalId), this.businesses.getById(businessId)]);
        const interval = query.interval ?? DashboardService.intervalFor(query.from, query.to);
        const { start, end } = DashboardService.rangeOf(query, business.timezone);
        const params = [businessId, scope.professionalId, start, end, business.timezone];
        const bucket = (column: string) => `to_char(date_trunc('${interval}', ${column} AT TIME ZONE $5), 'YYYY-MM-DD')`;

        const [appointments, received, ratings, newCustomers] = await Promise.all([
            this.dataSource.query(`
                SELECT ${bucket('a."startAt"')} AS start,
                    count(*) AS appointments,
                    count(*) FILTER (WHERE a.status = 'completed') AS completed,
                    count(*) FILTER (WHERE a.status = 'cancelled') AS cancelled,
                    count(*) FILTER (WHERE a.status = 'no_show') AS no_shows,
                    coalesce(sum(a."totalPrice") FILTER (WHERE a.status = 'completed'), 0) AS revenue,
                    coalesce(sum(a."commissionAmount" + ${LINE_COMMISSION}) FILTER (WHERE a.status = 'completed'), 0) AS commission
                ${IN_SCOPE} AND a."startAt" >= $3 AND a."startAt" < $4
                GROUP BY 1`, params) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT ${bucket('p."paidAt"')} AS start, coalesce(sum(p.amount), 0) AS received
                ${PAID_IN_SCOPE} AND p."paidAt" >= $3 AND p."paidAt" < $4
                GROUP BY 1`, params) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT ${bucket('r."createdAt"')} AS start, avg(r.rating) AS average_rating, count(*) AS rating_count
                ${REVIEWS_IN_SCOPE} AND r."createdAt" >= $3 AND r."createdAt" < $4
                GROUP BY 1`, params) as Promise<NumericRow[]>,
            this.dataSource.query(`
                WITH firsts AS (
                    SELECT a."customerId", min(a."startAt") AS first_at
                    ${IN_SCOPE} AND a.status = 'completed'
                    GROUP BY a."customerId"
                )
                SELECT ${bucket('first_at')} AS start, count(*) AS new_customers
                FROM firsts
                WHERE first_at >= $3 AND first_at < $4
                GROUP BY 1`, params) as Promise<NumericRow[]>,
        ]);

        const byStart = (rows: NumericRow[]) => new Map(rows.map((row) => [String(row.start), row]));
        const [appointmentsBy, receivedBy, ratingsBy, newCustomersBy] = [appointments, received, ratings, newCustomers].map(byStart);
        const buckets = DashboardService.bucketStarts(query.from, query.to, interval).map((key): DashboardBucketDto => {
            const a = appointmentsBy.get(key);
            const r = ratingsBy.get(key);
            const ratingCount = toNumber(r?.rating_count);
            return {
                start: key,
                appointments: toNumber(a?.appointments),
                completed: toNumber(a?.completed),
                cancelled: toNumber(a?.cancelled),
                noShows: toNumber(a?.no_shows),
                revenue: roundTo(toNumber(a?.revenue), 2),
                received: roundTo(toNumber(receivedBy.get(key)?.received), 2),
                commission: roundTo(toNumber(a?.commission), 2),
                newCustomers: toNumber(newCustomersBy.get(key)?.new_customers),
                averageRating: ratingCount ? roundTo(toNumber(r?.average_rating), 2) : null,
                ratingCount,
            };
        });
        return { ...scope, interval, period: { from: query.from, to: query.to }, buckets };
    }

    async professionalsBreakdown(businessId: string, actor: BusinessMembership, query: DashboardRangeQueryDto): Promise<DashboardProfessionalsResponseDto> {
        const params = await this.rangeParams(businessId, actor, query);
        const [rows, ratings] = await Promise.all([
            this.dataSource.query(`
                SELECT a."professionalId" AS id, pr."displayName" AS name,
                    count(*) FILTER (WHERE a.status = 'completed') AS completed,
                    count(*) FILTER (WHERE a.status = 'no_show') AS no_shows,
                    coalesce(sum(a."totalPrice") FILTER (WHERE a.status = 'completed'), 0) AS revenue,
                    coalesce(sum(a."commissionAmount" + ${LINE_COMMISSION}) FILTER (WHERE a.status = 'completed'), 0) AS commission
                FROM appointments a
                JOIN customers c ON c.id = a."customerId"
                JOIN professionals pr ON pr.id = a."professionalId"
                WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2)
                    AND a.status IN ('completed', 'no_show') AND a."startAt" >= $3 AND a."startAt" < $4
                GROUP BY a."professionalId", pr."displayName"`, params) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT r."professionalId" AS id, avg(r.rating) AS average_rating, count(*) AS rating_count
                ${REVIEWS_IN_SCOPE} AND r."professionalId" IS NOT NULL AND r."createdAt" >= $3 AND r."createdAt" < $4
                GROUP BY r."professionalId"`, params) as Promise<NumericRow[]>,
        ]);

        const ratingsBy = new Map(ratings.map((row) => [String(row.id), row]));
        const items = rows.map((row): DashboardProfessionalItemDto => {
            const completed = toNumber(row.completed);
            const noShows = toNumber(row.no_shows);
            const revenue = roundTo(toNumber(row.revenue), 2);
            const rating = ratingsBy.get(String(row.id));
            const ratingCount = toNumber(rating?.rating_count);
            return {
                professionalId: String(row.id),
                name: String(row.name),
                completed,
                noShows,
                revenue,
                averageTicket: ratio(revenue, completed, 2),
                noShowRate: ratio(noShows, completed + noShows),
                averageRating: ratingCount ? roundTo(toNumber(rating?.average_rating), 2) : null,
                ratingCount,
                commission: roundTo(toNumber(row.commission), 2),
            };
        });
        return { period: { from: query.from, to: query.to }, items: items.sort((a, b) => b.revenue - a.revenue || b.completed - a.completed) };
    }

    async servicesBreakdown(businessId: string, actor: BusinessMembership, query: DashboardRangeQueryDto): Promise<DashboardServicesResponseDto> {
        const params = await this.rangeParams(businessId, actor, query);
        const rows: NumericRow[] = await this.dataSource.query(`
            SELECT 'service' AS type, sv.id, sv.name, count(*) AS quantity, coalesce(sum(l.price), 0) AS revenue
            FROM appointment_services l
            JOIN appointments a ON a.id = l."appointmentId"
            JOIN customers c ON c.id = a."customerId"
            JOIN services sv ON sv.id = l."serviceId"
            WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2)
                AND a.status = 'completed' AND a."packageId" IS NULL AND a."startAt" >= $3 AND a."startAt" < $4
            GROUP BY sv.id, sv.name
            UNION ALL
            SELECT 'package' AS type, pk.id, pk.name, count(*) AS quantity, coalesce(sum(a."totalPrice"), 0) AS revenue
            FROM appointments a
            JOIN customers c ON c.id = a."customerId"
            JOIN packages pk ON pk.id = a."packageId"
            WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2)
                AND a.status = 'completed' AND a."startAt" >= $3 AND a."startAt" < $4
            GROUP BY pk.id, pk.name
            ORDER BY revenue DESC, quantity DESC, name`, params);
        return {
            period: { from: query.from, to: query.to },
            items: rows.map((row) => ({
                type: row.type === 'package' ? 'package' : 'service',
                id: String(row.id),
                name: String(row.name),
                quantity: toNumber(row.quantity),
                revenue: roundTo(toNumber(row.revenue), 2),
            })),
        };
    }

    async paymentMethodsBreakdown(businessId: string, actor: BusinessMembership, query: DashboardRangeQueryDto): Promise<DashboardPaymentMethodsResponseDto> {
        const params = await this.rangeParams(businessId, actor, query);
        const rows: NumericRow[] = await this.dataSource.query(`
            SELECT m.id, m.name, coalesce(sum(p.amount), 0) AS received, count(*) AS payments
            FROM payments p
            JOIN business_payment_methods m ON m.id = p."paymentMethodId"
            JOIN appointments a ON a.id = p."appointmentId"
            JOIN customers c ON c.id = a."customerId"
            WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2)
                AND p.status = 'paid' AND p."paidAt" >= $3 AND p."paidAt" < $4
            GROUP BY m.id, m.name
            ORDER BY received DESC, name`, params);
        return {
            period: { from: query.from, to: query.to },
            items: rows.map((row) => ({
                paymentMethodId: String(row.id),
                name: String(row.name),
                received: roundTo(toNumber(row.received), 2),
                payments: toNumber(row.payments),
            })),
        };
    }

    async inactiveCustomers(businessId: string, actor: BusinessMembership, query: DashboardScopeQueryDto): Promise<DashboardInactiveCustomersResponseDto> {
        const scope = await this.resolveScope(businessId, actor, query.professionalId);
        const cutoff = new Date(Date.now() - INACTIVE_AFTER_DAYS * DAY_MS);
        const rows: (NumericRow & { last_at: Date })[] = await this.dataSource.query(`
            WITH stats AS (
                SELECT a."customerId", max(a."startAt") AS last_at, count(*) AS completed
                ${IN_SCOPE} AND a.status = 'completed'
                GROUP BY a."customerId"
                HAVING count(*) >= 2 AND max(a."startAt") < $3
            )
            SELECT cu.id, cu.name, cu.phone, s.last_at, s.completed, count(*) OVER () AS total
            FROM stats s
            JOIN customers cu ON cu.id = s."customerId"
            WHERE cu."deletedAt" IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM appointments f
                    WHERE f."customerId" = cu.id AND f."deletedAt" IS NULL AND f.status IN ('pending', 'confirmed') AND f."startAt" >= now()
                )
            ORDER BY s.last_at DESC
            LIMIT ${INACTIVE_LIST_SIZE}`, [businessId, scope.professionalId, cutoff]);
        return {
            inactiveAfterDays: INACTIVE_AFTER_DAYS,
            total: toNumber(rows[0]?.total),
            items: rows.map((row) => ({
                customerId: String(row.id),
                name: String(row.name),
                phone: row.phone === null ? null : String(row.phone),
                lastCompletedAt: new Date(row.last_at),
                completedCount: toNumber(row.completed),
            })),
        };
    }

    async heatmap(businessId: string, actor: BusinessMembership, query: DashboardRangeQueryDto): Promise<DashboardHeatmapResponseDto> {
        DashboardService.ensurePeriod(query.from, query.to, 'to');
        const [scope, business] = await Promise.all([this.resolveScope(businessId, actor, query.professionalId), this.businesses.getById(businessId)]);
        const { start, end } = DashboardService.rangeOf(query, business.timezone);
        const rows: NumericRow[] = await this.dataSource.query(`
            SELECT extract(dow FROM a."startAt" AT TIME ZONE $5)::int AS weekday,
                extract(hour FROM a."startAt" AT TIME ZONE $5)::int AS hour,
                count(*) AS appointments
            ${IN_SCOPE} AND a.status = 'completed' AND a."startAt" >= $3 AND a."startAt" < $4
            GROUP BY 1, 2
            ORDER BY 1, 2`, [businessId, scope.professionalId, start, end, business.timezone]);
        return {
            ...scope,
            period: { from: query.from, to: query.to },
            cells: rows.map((row) => ({ weekday: toNumber(row.weekday), hour: toNumber(row.hour), appointments: toNumber(row.appointments) })),
        };
    }

    async occupancy(businessId: string, actor: BusinessMembership, query: DashboardSummaryQueryDto): Promise<DashboardOccupancyResponseDto> {
        DashboardService.ensurePeriod(query.from, query.to, 'to');
        const comparison = DashboardService.comparisonOf(query);
        const [scope, business] = await Promise.all([this.resolveScope(businessId, actor, query.professionalId), this.businesses.getById(businessId)]);
        const professionals: { id: string; name: string }[] = await this.dataSource.query(`
            SELECT pr.id, pr."displayName" AS name
            FROM professionals pr
            JOIN business_members m ON m.id = pr."memberId"
            WHERE m."businessId" = $1 AND pr."deletedAt" IS NULL AND m."deletedAt" IS NULL AND m.status = 'active'
                AND ($2::uuid IS NULL OR pr.id = $2)
            ORDER BY pr."displayName"`, [businessId, scope.professionalId]);
        const ids = professionals.map(({ id }) => id);
        const workingHours: WorkingHoursRow[] = ids.length
            ? await this.dataSource.query(`
                SELECT "professionalId", "dayOfWeek", "startTime", "endTime", "isDayOff"
                FROM professional_working_hours
                WHERE "professionalId" = ANY($1::uuid[])`, [ids])
            : [];

        const [current, previous] = await Promise.all([
            this.occupancyOf(businessId, scope, ids, workingHours, query, business.timezone),
            this.occupancyOf(businessId, scope, ids, workingHours, comparison, business.timezone),
        ]);
        const totals = (minutes: Map<string, OccupancyMinutes>): DashboardOccupancyDto => {
            const sum = [...minutes.values()].reduce((acc, m) => ({ booked: acc.booked + m.booked, available: acc.available + m.available }), { booked: 0, available: 0 });
            return { bookedMinutes: sum.booked, availableMinutes: sum.available, rate: ratio(sum.booked, sum.available) };
        };
        return {
            ...scope,
            period: { from: query.from, to: query.to },
            comparison,
            current: totals(current),
            previous: totals(previous),
            professionals: professionals
                .map(({ id, name }) => {
                    const minutes = current.get(id) ?? { booked: 0, available: 0 };
                    return { professionalId: id, name, bookedMinutes: minutes.booked, availableMinutes: minutes.available, rate: ratio(minutes.booked, minutes.available) };
                })
                .filter(({ availableMinutes, bookedMinutes }) => availableMinutes > 0 || bookedMinutes > 0)
                .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)),
        };
    }

    private async occupancyOf(
        businessId: string,
        scope: Scope,
        professionalIds: string[],
        workingHours: WorkingHoursRow[],
        period: DashboardPeriodDto,
        timeZone: string,
    ): Promise<Map<string, OccupancyMinutes>> {
        const minutes = new Map<string, OccupancyMinutes>(professionalIds.map((id) => [id, { booked: 0, available: 0 }]));
        if (!professionalIds.length) {
            return minutes;
        }
        const { start, end } = DashboardService.rangeOf(period, timeZone);
        const [booked, timeOffs] = await Promise.all([
            this.dataSource.query(`
                SELECT a."professionalId" AS id,
                    coalesce(sum(extract(epoch FROM least(a."endAt", $4) - greatest(a."startAt", $3))), 0) / 60 AS minutes
                ${IN_SCOPE} AND a.status IN ('completed', 'confirmed', 'in_progress') AND a."startAt" < $4 AND a."endAt" > $3
                    AND a."startAt" > $3::timestamptz - interval '5 days'
                GROUP BY a."professionalId"`, [businessId, scope.professionalId, start, end]) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT "professionalId", "startAt", "endAt"
                FROM professional_time_offs
                WHERE "professionalId" = ANY($1::uuid[]) AND "startAt" < $3 AND "endAt" > $2`, [professionalIds, start, end]) as Promise<TimeOffRow[]>,
        ]);

        for (const row of booked) {
            const entry = minutes.get(String(row.id));
            if (entry) {
                entry.booked = Math.round(toNumber(row.minutes));
            }
        }
        const hoursBy = new Map(workingHours.map((row) => [`${row.professionalId}:${row.dayOfWeek}`, row]));
        for (let day = period.from; day <= period.to; day = addDays(day, 1)) {
            const weekday = weekdayOf(day);
            for (const id of professionalIds) {
                const hours = hoursBy.get(`${id}:${weekday}`);
                if (!hours || hours.isDayOff || !hours.startTime || !hours.endTime) {
                    continue;
                }
                const shiftStart = zonedTimeToUtc(day, hours.startTime.slice(0, 5), timeZone).getTime();
                const shiftEnd = zonedTimeToUtc(day, hours.endTime.slice(0, 5), timeZone).getTime();
                const away = timeOffs
                    .filter((off) => off.professionalId === id)
                    .reduce((total, off) => total + Math.max(0, Math.min(shiftEnd, new Date(off.endAt).getTime()) - Math.max(shiftStart, new Date(off.startAt).getTime())), 0);
                minutes.get(id)!.available += Math.max(0, Math.round((shiftEnd - shiftStart - away) / MINUTE_MS));
            }
        }
        return minutes;
    }

    private async rangeParams(businessId: string, actor: BusinessMembership, query: DashboardRangeQueryDto): Promise<(string | Date | null)[]> {
        DashboardService.ensurePeriod(query.from, query.to, 'to');
        const [scope, business] = await Promise.all([this.resolveScope(businessId, actor, query.professionalId), this.businesses.getById(businessId)]);
        const { start, end } = DashboardService.rangeOf(query, business.timezone);
        return [businessId, scope.professionalId, start, end];
    }

    private async metrics(params: (string | null)[], { start, end }: Range): Promise<DashboardMetricsDto> {
        const ranged = [...params, start, end];
        const [[totals], [received], [receivable], [customers], [ratings]] = await Promise.all([
            this.dataSource.query(`
                SELECT count(*) AS appointments,
                    count(*) FILTER (WHERE a.status = 'cancelled') AS cancelled,
                    count(*) FILTER (WHERE a.status = 'completed') AS completed,
                    count(*) FILTER (WHERE a.status = 'no_show') AS no_shows,
                    coalesce(sum(a."totalPrice") FILTER (WHERE a.status = 'completed'), 0) AS revenue,
                    coalesce(sum(a."commissionAmount" + ${LINE_COMMISSION}) FILTER (WHERE a.status = 'completed'), 0) AS commission,
                    count(*) FILTER (WHERE a.origin = 'customer') AS online,
                    count(*) FILTER (WHERE a.origin IS NOT NULL) AS known_origin
                ${IN_SCOPE} AND a."startAt" >= $3 AND a."startAt" < $4`, ranged) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT coalesce(sum(p.amount), 0) AS received
                ${PAID_IN_SCOPE} AND p."paidAt" >= $3 AND p."paidAt" < $4`, ranged) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT coalesce(sum(a."totalPrice" - paid.amount), 0) AS receivable
                FROM appointments a
                JOIN customers c ON c.id = a."customerId"
                CROSS JOIN LATERAL (
                    SELECT coalesce(sum(p.amount), 0) AS amount FROM payments p WHERE p."appointmentId" = a.id AND p.status = 'paid'
                ) paid
                WHERE c."businessId" = $1 AND a."deletedAt" IS NULL AND ($2::uuid IS NULL OR a."professionalId" = $2)
                    AND a.status = 'completed' AND a."startAt" < $3 AND a."totalPrice" > paid.amount`, [...params, end]) as Promise<NumericRow[]>,
            this.dataSource.query(`
                WITH firsts AS (
                    SELECT a."customerId", min(a."startAt") AS first_at
                    ${IN_SCOPE} AND a.status = 'completed' AND a."startAt" < $4
                        AND a."customerId" IN (SELECT a."customerId" ${IN_SCOPE} AND a.status = 'completed' AND a."startAt" >= $3 AND a."startAt" < $4)
                    GROUP BY a."customerId"
                )
                SELECT count(*) AS served, count(*) FILTER (WHERE first_at >= $3) AS new_customers FROM firsts`, ranged) as Promise<NumericRow[]>,
            this.dataSource.query(`
                SELECT avg(r.rating) AS average_rating, count(*) AS rating_count
                ${REVIEWS_IN_SCOPE} AND r."createdAt" >= $3 AND r."createdAt" < $4`, ranged) as Promise<NumericRow[]>,
        ]);

        const appointments = toNumber(totals?.appointments);
        const cancelled = toNumber(totals?.cancelled);
        const completed = toNumber(totals?.completed);
        const noShows = toNumber(totals?.no_shows);
        const revenue = roundTo(toNumber(totals?.revenue), 2);
        const served = toNumber(customers?.served);
        const newCustomers = toNumber(customers?.new_customers);
        const ratingCount = toNumber(ratings?.rating_count);
        return {
            appointments,
            cancelled,
            completed,
            noShows,
            revenue,
            received: roundTo(toNumber(received?.received), 2),
            receivable: roundTo(toNumber(receivable?.receivable), 2),
            averageTicket: ratio(revenue, completed, 2),
            noShowRate: ratio(noShows, completed + noShows),
            cancellationRate: ratio(cancelled, appointments),
            customersServed: served,
            newCustomers,
            returningCustomers: served - newCustomers,
            averageRating: ratingCount ? roundTo(toNumber(ratings?.average_rating), 2) : null,
            ratingCount,
            onlineShare: ratio(toNumber(totals?.online), toNumber(totals?.known_origin)),
            commission: roundTo(toNumber(totals?.commission), 2),
        };
    }

    private async resolveScope(businessId: string, actor: BusinessMembership, professionalId: string | undefined): Promise<Scope> {
        if (actor.roles.some((r) => r === BusinessMemberRole.OWNER || r === BusinessMemberRole.ADMIN)) {
            if (professionalId) {
                await this.professionals.ensureExists(businessId, professionalId);
            }
            return { scope: 'business', professionalId: professionalId ?? null };
        }
        const own = await this.professionals.findByMember(businessId, actor.id);
        if (!own) {
            throw new AppException(ErrorCode.INSUFFICIENT_BUSINESS_ROLE, HttpStatus.FORBIDDEN, 'Só gestores e profissionais veem os indicadores.');
        }
        return { scope: 'professional', professionalId: own.id };
    }

    private static comparisonOf(query: DashboardSummaryQueryDto): DashboardPeriodDto {
        if (query.compareFrom === undefined && query.compareTo === undefined) {
            const length = daysBetween(query.from, query.to) + 1;
            return { from: addDays(query.from, -length), to: addDays(query.from, -1) };
        }
        if (query.compareFrom === undefined || query.compareTo === undefined) {
            throw DashboardService.invalid(query.compareFrom === undefined ? 'compareFrom' : 'compareTo', 'compareFrom and compareTo must be sent together');
        }
        DashboardService.ensurePeriod(query.compareFrom, query.compareTo, 'compareTo');
        return { from: query.compareFrom, to: query.compareTo };
    }

    private static ensurePeriod(from: string, to: string, path: string): void {
        const days = daysBetween(from, to);
        if (!(days >= 0 && days < MAX_PERIOD_DAYS)) {
            throw DashboardService.invalid(path, `${path} must be on or after the start and at most ${MAX_PERIOD_DAYS} days long`);
        }
    }

    private static rangeOf(period: DashboardPeriodDto, timeZone: string): Range {
        return { start: zonedTimeToUtc(period.from, '00:00', timeZone), end: zonedTimeToUtc(addDays(period.to, 1), '00:00', timeZone) };
    }

    private static intervalFor(from: string, to: string): DashboardInterval {
        const days = daysBetween(from, to) + 1;
        if (days <= DAILY_MAX_DAYS) {
            return 'day';
        }
        return days <= WEEKLY_MAX_DAYS ? 'week' : 'month';
    }

    private static bucketStarts(from: string, to: string, interval: DashboardInterval): string[] {
        const starts: string[] = [];
        for (let key = DashboardService.truncate(from, interval); key <= to; key = DashboardService.nextBucket(key, interval)) {
            starts.push(key);
        }
        return starts;
    }

    private static truncate(date: string, interval: DashboardInterval): string {
        if (interval === 'week') {
            return addDays(date, -((weekdayOf(date) + 6) % 7));
        }
        return interval === 'month' ? `${date.slice(0, 8)}01` : date;
    }

    private static nextBucket(start: string, interval: DashboardInterval): string {
        if (interval === 'day') {
            return addDays(start, 1);
        }
        if (interval === 'week') {
            return addDays(start, 7);
        }
        return DashboardService.truncate(addDays(start, 31), 'month');
    }

    private static invalid(path: string, message: string): AppException {
        return new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', [{ path, message }]);
    }
}
