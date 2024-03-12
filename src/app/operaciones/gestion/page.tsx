import moment from "moment";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import CustomPagination from "~/app/components/CustomPagination";
import OperationsFeed from "~/app/components/OperationsFeed";
import FilterOperationsForm from "~/app/components/forms/FilterOperationsForm";
import { Separator } from "~/app/components/ui/separator";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import { type RouterInputs } from "~/trpc/shared";
const LoadingAnimation = dynamic(
  () => import("~/app/components/LoadingAnimation"),
);

const Page = async ({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) => {
  const session = await getServerAuthSession();

  const selectedPage = (searchParams.pagina as string) ?? "1";
  const selectedFromEntity = searchParams.origen;
  const selectedToEntity = searchParams.destino as string;
  const selectedCurrency = searchParams.divisa as string;
  const selectedDateGreater = searchParams.diaDesde as string;
  const selectedDateLesser = searchParams.diaHasta as string;
  const selectedType = searchParams.tipo as string;
  const selectedOperator = searchParams.operador as string;
  const selectedAmount = searchParams.monto as string;
  const selectedAmountGreater = searchParams.montoMin as string;
  const selectedAmountLesser = searchParams.montoMax as string;
  const selectedUploadUserId = searchParams.cargadoPor as string;
  const selectedConfirmationUserId = searchParams.confirmadoPor as string;

  const operationsQueryInput: RouterInputs["operations"]["getOperations"] = {
    limit: 8,
    page: parseInt(selectedPage),
  };

  if (selectedFromEntity) {
    operationsQueryInput.fromEntityId = Array.isArray(selectedFromEntity)
      ? selectedFromEntity.flatMap((nString) => parseInt(nString))
      : parseInt(selectedFromEntity);
  }
  if (selectedToEntity) {
    operationsQueryInput.toEntityId = parseInt(selectedToEntity);
  }
  if (selectedCurrency) {
    operationsQueryInput.currency = selectedCurrency;
  }
  if (selectedDateGreater) {
    operationsQueryInput.opDateIsGreater = moment(
      selectedDateGreater,
      "DD-MM-YYYY",
    ).toDate();
  }
  if (selectedDateLesser) {
    operationsQueryInput.opDateIsLesser = moment(
      selectedDateLesser,
      "DD-MM-YYYY",
    ).toDate();
  }
  if (selectedType) {
    operationsQueryInput.transactionType = selectedType;
  }
  if (selectedOperator) {
    operationsQueryInput.operatorEntityId = parseInt(selectedOperator);
  }
  if (selectedAmount) {
    operationsQueryInput.amount = parseFloat(selectedAmount);
  } else if (selectedAmountGreater) {
    operationsQueryInput.amountIsGreater = parseFloat(selectedAmountGreater);
  } else if (selectedAmountLesser) {
    operationsQueryInput.amountIsLesser = parseFloat(selectedAmountLesser);
  }
  if (selectedUploadUserId) {
    operationsQueryInput.uploadedById = selectedUploadUserId;
  }
  if (selectedConfirmationUserId) {
    operationsQueryInput.confirmedById = selectedConfirmationUserId;
  }

  const initialOperations = await api.operations.getOperations.query(
    operationsQueryInput,
  );

  const initialEntities = await api.entities.getAll.query();

  const users = await api.users.getAll.query();

  return (
    <div className="flex w-full flex-col">
      <h1 className="mb-4 text-4xl font-bold tracking-tighter">Operaciones</h1>
      {session && (
        <>
          <div className="flex flex-col justify-start">
            <FilterOperationsForm entities={initialEntities} users={users} />
            <Separator className="my-4" />
            <CustomPagination
              itemName="operaciones"
              page={operationsQueryInput.page}
              pageSize={operationsQueryInput.limit}
              totalCount={initialOperations.count}
              pathname="/operaciones/gestion"
            />
          </div>
          <Suspense
            fallback={<LoadingAnimation text={"Cargando operaciones"} />}
          >
            <OperationsFeed
              users={users}
              initialEntities={initialEntities}
              initialOperations={initialOperations}
              operationsQueryInput={operationsQueryInput}
              user={session.user}
            />
          </Suspense>
          <CustomPagination
            page={operationsQueryInput.page}
            pageSize={operationsQueryInput.limit}
            totalCount={initialOperations.count}
            pathname="/operaciones/gestion"
            itemName="operaciones"
          />
        </>
      )}
    </div>
  );
};

export default Page;
