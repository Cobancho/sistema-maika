"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { type User } from "lucia";
import moment from "moment";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { capitalizeFirstLetter } from "~/lib/functions";
import { useInitialOperationStore } from "~/stores/InitialOperationStore";
import { useTransactionsStore } from "~/stores/TransactionsStore";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";
import UploadedUserOperations from "../UploadedUserOperations";
import AlertTemplate from "../ui/AlertTemplate";
import { Icons } from "../ui/Icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList } from "../ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useToast } from "../ui/use-toast";
import InitialDataOperationForm from "./InitialDataOperationForm";
const CambioForm = dynamic(() => import("./CambioForm"));
const CableForm = dynamic(() => import("./CableForm"));
const FlexibleTransactionsForm = dynamic(
  () => import("./FlexibleTransactionsForm"),
);

interface AddOperationProps {
  initialEntities: RouterOutputs["entities"]["getAll"];
  user: User;
  userPermissions: RouterOutputs["users"]["getAllPermissions"];
  initialOperations:
  | RouterOutputs["operations"]["getOperationsByUser"]
  | undefined;
  tags: RouterOutputs["tags"]["getAll"];
}

const AddOperation = ({
  initialEntities,
  user,
  initialOperations,
}: AddOperationProps) => {
  const { toast } = useToast();
  const [parent] = useAutoAnimate();
  const [tabName, setTabName] = useState("flexible");
  const searchParams = useSearchParams();

  const selectedOpIdString = searchParams.get("operacion");
  const selectedOpId = selectedOpIdString ? parseInt(selectedOpIdString) : null;

  const utils = api.useContext();

  const {
    isInitialOperationSubmitted,
    initialOperationStore,
    resetInitialOperationStore,
    setIsInitialOperationSubmitted,
  } = useInitialOperationStore();
  const {
    transactionsStore,
    removeTransactionFromStore,
    resetTransactionsStore,
  } = useTransactionsStore();

  const { data: operations, isLoading: isOperationsLoading } =
    api.operations.getOperationsByUser.useQuery(undefined, {
      initialData: initialOperations,
      refetchOnWindowFocus: false,
    });

  const { mutateAsync, isLoading } = api.operations.insertOperation.useMutation(
    {
      async onMutate(newOperation) {
        const transaccionesCargadas = newOperation.transactions.length;
        if (newOperation.opId) {
          toast({
            title: `${transaccionesCargadas > 1
                ? transaccionesCargadas.toString() +
                ` transacciones cargadas a la operación ${newOperation.opId}`
                : transaccionesCargadas +
                ` transaccion cargada a la operación ${newOperation.opId}`
              }`,
          });
        } else {
          toast({
            title: `Operacion y ${transaccionesCargadas > 1
                ? transaccionesCargadas.toString() + " transacciones cargadas"
                : transaccionesCargadas + " transaccion cargada"
              }`,
          });
        }

        // Doing the Optimistic update
        await utils.operations.getOperationsByUser.cancel();

        const prevData = utils.operations.getOperationsByUser.getData();

        const fakeNewData: RouterOutputs["operations"]["getOperationsByUser"][number] =
        {
          id: 0,
          date: newOperation.opDate,
          observations: newOperation.opObservations
            ? newOperation.opObservations
            : "",
          transactionsCount: newOperation.transactions.length,
        };

        utils.operations.getOperationsByUser.setData(undefined, (old) => [
          fakeNewData,
          // @ts-ignore
          ...old,
        ]);

        return { prevData };
      },
      onError(err, newOperation, ctx) {
        utils.operations.getOperationsByUser.setData(undefined, ctx?.prevData);

        // Doing some ui actions
        toast({
          title:
            "No se pudo cargar la operación y las transacciones relacionadas",
          description: `${JSON.stringify(err.message)}`,
          variant: "destructive",
        });
      },
      onSettled() {
        void utils.operations.getOperationsByUser.invalidate();
        setIsInitialOperationSubmitted(false);
        resetTransactionsStore();
        resetInitialOperationStore();
      },
    },
  );

  const { isLoading: isEntitiesLoading, data: entities } =
    api.entities.getFiltered.useQuery(
      { permissionName: "OPERATIONS_CREATE" },
      {
        initialData: initialEntities,
      },
    );

  const tabs = ["flexible", "cambio", "cable"];

  return (
    <div className="mx-4 grid grid-cols-1 gap-8 lg:mx-auto lg:grid-cols-4">
      <div className="lg:col-span-1">
        <Card>
          {isInitialOperationSubmitted || selectedOpId ? (
            <>
              <CardHeader>
                <div className="flex flex-row justify-between">
                  <div className="flex flex-col">
                    <CardTitle>
                      {moment(initialOperationStore.opDate).format(
                        "DD-MM-YYYY",
                      )}{" "}
                    </CardTitle>
                    <CardDescription className="text-2xl font-semibold text-muted-foreground">
                      {initialOperationStore.opTime}
                    </CardDescription>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="bg-primary"
                          onClick={() => setIsInitialOperationSubmitted(false)}
                        >
                          <Icons.undo className="h-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Volver</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <CardTitle>
                  <span className="mr-2 text-primary">
                    {transactionsStore.length}
                  </span>
                  {transactionsStore.length === 1
                    ? "transacción"
                    : "transacciones"}
                </CardTitle>
                {initialOperationStore.opObservations && (
                  <h1 className="text-sm text-muted-foreground">
                    {initialOperationStore.opObservations}
                  </h1>
                )}
              </CardHeader>
              {transactionsStore && (
                <>
                  <CardContent className="flex flex-col space-y-4" ref={parent}>
                    {transactionsStore.map((transaction) => (
                      <div
                        key={transaction.txId}
                        className="flex flex-col space-y-4"
                      >
                        <h1 className="text-sm text-muted-foreground">
                          Tx {transaction.txId}
                        </h1>
                        <div className="grid grid-cols-3 items-center">
                          <Badge
                            className="justify-self-center"
                            variant="outline"
                          >
                            {
                              entities.find(
                                (obj) => obj.id === transaction.fromEntityId,
                              )?.name
                            }
                          </Badge>
                          <div className="flex flex-col items-center justify-self-center">
                            <Icons.arrowRight className="h-6" />
                            <p className="font-semibold">
                              {new Intl.NumberFormat("es-AR").format(
                                transaction.amount,
                              )}
                            </p>
                            <p className="font-medium leading-none text-muted-foreground">
                              {transaction.currency.toUpperCase()}
                            </p>
                            <p className="mt-1 font-medium leading-none text-muted-foreground">
                              {transaction.method &&
                                capitalizeFirstLetter(transaction.method)}
                            </p>
                          </div>
                          <Badge
                            className="justify-self-center"
                            variant="outline"
                          >
                            {
                              entities.find(
                                (obj) => obj.id === transaction.toEntityId,
                              )?.name
                            }
                          </Badge>
                        </div>
                        <div className="flex flex-col items-start space-y-2">
                          <Badge
                            variant="outline"
                            className="mr-auto flex justify-center"
                          >
                            {capitalizeFirstLetter(transaction.type)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="mr-auto flex flex-row justify-center space-x-1"
                          >
                            <p>
                              {moment(transaction.date).format("DD-MM-YYYY")}
                            </p>
                            <span className="text-muted-foreground">
                              {transaction.time}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex flex-row justify-between">
                          <div className="flex flex-col justify-start space-y-1">
                            <p className="text-sm font-medium">Operador</p>
                            <Badge variant="outline">
                              {
                                entities.find(
                                  (obj) => obj.id === transaction.operatorId,
                                )?.name
                              }
                            </Badge>
                          </div>

                          <Button
                            onClick={() =>
                              removeTransactionFromStore(transaction.txId)
                            }
                            className="bg-transparent p-1 hover:scale-125 hover:bg-transparent"
                          >
                            <Icons.removePackage className="h-6 text-red" />
                          </Button>
                        </div>
                        <Separator className="mt-1" />
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="flex flex-col items-center space-y-2">
                    <Button
                      className="w-full"
                      disabled={transactionsStore.length > 0 ? false : true}
                      onClick={async () => {
                        const [hoursString, minutesString] =
                          initialOperationStore.opTime.split(":");
                        const opDate = moment(initialOperationStore.opDate)
                          .set({
                            hour: hoursString
                              ? parseInt(hoursString)
                              : moment().hours(),
                            minute: minutesString
                              ? parseInt(minutesString)
                              : moment().minutes(),
                          })
                          .toDate();
                        console.log(
                          moment(initialOperationStore.opDate)
                            .set({
                              hour: hoursString
                                ? parseInt(hoursString)
                                : moment().hours(),
                              minute: minutesString
                                ? parseInt(minutesString)
                                : moment().minutes(),
                            })
                            .toDate(),
                        );
                        await mutateAsync({
                          opDate,
                          opObservations: initialOperationStore.opObservations,
                          opId: selectedOpId,
                          transactions: transactionsStore.map(
                            (transaction) => ({
                              type: transaction.type,
                              date:
                                transaction.date && transaction.time
                                  ? moment(
                                    `${moment(transaction.date).format(
                                      "YYYY-MM-DD",
                                    )} ${transaction.time}`,
                                    "YYYY-MM-DD HH:mm",
                                  ).toDate()
                                  : transaction.date
                                    ? transaction.date
                                    : undefined,
                              operatorEntityId: transaction.operatorId,
                              fromEntityId: transaction.fromEntityId,
                              toEntityId: transaction.toEntityId,
                              currency: transaction.currency,
                              amount: transaction.amount,
                              method: transaction.method,
                              metadata: transaction.metadata,
                            }),
                          ),
                        });
                      }}
                    >
                      <Icons.addPackage className="mr-2 h-4 w-4" />
                      {isLoading ? (
                        <p>Cargando...</p>
                      ) : !!selectedOpId ? (
                        <p>Cargar a la operación {selectedOpId} </p>
                      ) : (
                        <p>Cargar operación</p>
                      )}
                    </Button>
                    {transactionsStore.length < 1 && (
                      <p className="text-sm">
                        Añadí una transacción para continuar{" "}
                      </p>
                    )}
                  </CardFooter>
                </>
              )}
            </>
          ) : (
            <p>Seleccioná una fecha para empezar la operación</p>
          )}
        </Card>
      </div>
      <div className="lg:col-span-2">
        {isInitialOperationSubmitted || selectedOpId ? (
          entities &&
          user && (
            <div>
              <Tabs value={tabName} className="w-full">
                <TabsList className="mb-8 grid w-full auto-cols-fr grid-flow-col gap-2 bg-transparent">
                  {tabs.map((tab) => (
                    <AlertTemplate
                      key={tab}
                      buttonText={capitalizeFirstLetter(tab)}
                      buttonStyling={
                        tabName === tab
                          ? "bg-primary text-white"
                          : "bg-muted text-foreground"
                      }
                      alertTitle={`¿Seguro que querés cambiar a ${tab}?`}
                      alertAccept="Confirmar"
                      alertCancel="Cancelar"
                      alertDescription="Se perderán los datos no cargados a la operación"
                      alertFunction={() => setTabName(tab)}
                    />
                  ))}
                </TabsList>
                <TabsContent
                  value="flexible"
                  className="mx-auto flex flex-col items-center"
                >
                  <FlexibleTransactionsForm
                    isLoading={isEntitiesLoading}
                    entities={entities}
                    user={user}
                  />
                </TabsContent>
                <TabsContent value="cambio">
                  <CambioForm
                    entities={entities}
                    user={user}
                    isLoading={isEntitiesLoading}
                  />
                </TabsContent>
                <TabsContent value="cable">
                  <CableForm
                    entities={entities}
                    userEntityId={
                      entities
                        .find((entity) => entity.name === user.name)!
                        .id.toString()
                        ? entities
                          .find((entity) => entity.name === user.name)!
                          .id.toString()
                        : ""
                    }
                  />
                </TabsContent>
              </Tabs>
            </div>
          )
        ) : (
          <InitialDataOperationForm />
        )}
      </div>
      <div className="lg:col-span-1">
        <UploadedUserOperations
          operations={operations}
          ref={parent}
          isLoading={isOperationsLoading}
        />
      </div>
    </div>
  );
};

export default AddOperation;
