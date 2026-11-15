import { redirect, type LoaderFunctionArgs } from "react-router";
import { prefetch, queryClient } from "@/app/query-client";
import {
  businessPath,
  businessQueries,
  canManageBusiness,
} from "@/features/businesses";
import { catalogQueries } from "@/features/catalog";
import { hasErrorCode } from "@/shared/api/api-error";
import { ErrorCode } from "@/shared/api/error-code";
import { professionalQueries } from "./api/professionals.queries";

const requireManager = async ({ params }: LoaderFunctionArgs) => {
  const { businessId } = params;
  if (!businessId) throw redirect("/");

  const businesses = await queryClient.query(businessQueries.mine());
  const business = businesses.find(({ id }) => id === businessId);
  if (!business || !canManageBusiness(business.roles))
    throw redirect(businessPath(businessId));

  return businessId;
};

export const professionalsPath = (businessId: string) =>
  `${businessPath(businessId)}/professionals`;

export const professionalsLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireManager(args);

  prefetch(queryClient.query(professionalQueries.list(businessId)));
  prefetch(queryClient.query(businessQueries.members(businessId)));
  return null;
};

export const professionalLoader = async (args: LoaderFunctionArgs) => {
  const businessId = await requireManager(args);
  const { professionalId } = args.params;
  if (!professionalId) throw redirect(professionalsPath(businessId));

  prefetch(
    queryClient.query(
      professionalQueries.workingHours(businessId, professionalId),
    ),
  );
  prefetch(
    queryClient.query(professionalQueries.timeOffs(businessId, professionalId)),
  );
  prefetch(queryClient.query(professionalQueries.specialties(businessId)));
  prefetch(queryClient.query(businessQueries.hours(businessId)));
  prefetch(queryClient.query(catalogQueries.services(businessId)));
  prefetch(queryClient.query(catalogQueries.packages(businessId)));

  try {
    await queryClient.query(
      professionalQueries.detail(businessId, professionalId),
    );
  } catch (error) {
    if (hasErrorCode(error, ErrorCode.PROFESSIONAL_NOT_FOUND)) {
      throw redirect(professionalsPath(businessId));
    }
    throw error;
  }
  return null;
};
