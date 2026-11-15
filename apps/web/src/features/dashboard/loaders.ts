import { redirect, type LoaderFunctionArgs } from "react-router";
import { prefetch, queryClient } from "@/app/query-client";
import { businessQueries, canManageBusiness } from "@/features/businesses";
import { professionalQueries } from "@/features/professionals";
import { subscriptionQueries } from "@/features/subscriptions";
import { userQueries } from "@/features/users";
import { dashboardQueries } from "./api/dashboard.queries";
import { businessToday, resolveFilters } from "./period";
import { loadDashboardSearchParams } from "./search-params";

export const dashboardLoader = async ({
  params,
  request,
}: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect("/");

  prefetch(queryClient.query(businessQueries.members(businessId)));
  prefetch(queryClient.query(subscriptionQueries.byBusiness(businessId)));
  const [, businesses, business] = await Promise.all([
    queryClient.query(userQueries.me()),
    queryClient.query(businessQueries.mine()),
    queryClient.query(businessQueries.detail(businessId)),
    queryClient.query(professionalQueries.list(businessId)),
  ]);

  const search = loadDashboardSearchParams(request);
  const canManage = canManageBusiness(
    businesses.find(({ id }) => id === businessId)?.roles ?? [],
  );
  const filters = resolveFilters(
    { ...search, professionalId: canManage ? search.professional : null },
    businessToday(business.timezone),
  );
  prefetch(queryClient.query(dashboardQueries.summary(businessId, filters)));
  prefetch(queryClient.query(dashboardQueries.timeseries(businessId, filters)));
  prefetch(queryClient.query(dashboardQueries.occupancy(businessId, filters)));
  prefetch(queryClient.query(dashboardQueries.heatmap(businessId, filters)));
  if (canManage) {
    prefetch(queryClient.query(dashboardQueries.services(businessId, filters)));
    prefetch(
      queryClient.query(dashboardQueries.paymentMethods(businessId, filters)),
    );
    prefetch(
      queryClient.query(
        dashboardQueries.inactiveCustomers(businessId, filters.professionalId),
      ),
    );
    if (filters.professionalId === null) {
      prefetch(
        queryClient.query(dashboardQueries.professionals(businessId, filters)),
      );
    }
  }
  return null;
};
