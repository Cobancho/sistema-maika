"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Entities } from "@prisma/client";
import { Separator } from "@radix-ui/react-dropdown-menu";
import type { User } from "next-auth";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { currencies, operationTypes, paymentMethods } from "~/lib/variables";
import { useTransactionsStore } from "~/stores/TransactionsStore";
import { api } from "~/trpc/react";
import EntityCard from "../ui/EntityCard";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Icons } from "../ui/icons";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import CustomSelector from "./CustomSelector";

const FormSchema = z.object({
  transactions: z.array(
    z.object({
      type: z.string(),
      fromEntityId: z.string().min(1),
      toEntityId: z.string().min(1),
      operatorId: z.string().min(1),
      currency: z.string().min(1),
      amount: z.string().min(1),
      method: z.string().optional(),
      direction: z.boolean().optional().default(false),
    }),
  ),
});

interface FlexibleTransactionsFormProps {
  user: User;
  initialEntities: Entities[];
}

const FlexibleTransactionsForm = ({
  user,
  initialEntities,
}: FlexibleTransactionsFormProps) => {
  const { isLoading, data: entities } = api.entities.getAll.useQuery(
    undefined,
    {
      initialData: initialEntities,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  );

  const userEntityId = user
    ? entities?.find((obj) => obj.name === user.name)?.id ?? ""
    : "";

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      transactions: [
        {
          operatorId: userEntityId?.toString(),
          currency: "usd",
          direction: false,
        },
      ],
    },
  });

  const { handleSubmit, control, watch, reset } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "transactions",
  });

  const { addTransactionToStore } = useTransactionsStore();

  const watchTransactions = watch("transactions");

  const onSubmit = (values: z.infer<typeof FormSchema>) => {
    values.transactions.forEach((transaction) =>
      addTransactionToStore({
        type: transaction.type,
        fromEntityId: transaction.direction
          ? parseInt(transaction.toEntityId)
          : parseInt(transaction.fromEntityId),
        toEntityId: transaction.direction
          ? parseInt(transaction.fromEntityId)
          : parseInt(transaction.toEntityId),
        operatorId: parseInt(transaction.operatorId),
        currency: transaction.currency,
        amount: parseFloat(transaction.amount),
        method: transaction.method,
      }),
    );

    reset();
  };

  const onError = (error) => {
    console.log(error);
  };

  const [parent] = useAutoAnimate();

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="flex flex-col justify-center"
        ref={parent}
      >
        {fields.map((field, index) => (
          <>
            <div
              key={field.id}
              className="grid grid-cols-1 justify-center gap-4 lg:grid-cols-3"
            >
              {entities && (
                <div className="justify-self-end">
                  <FormField
                    control={control}
                    name={`transactions.${index}.fromEntityId`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Entidad</FormLabel>
                        <CustomSelector
                          isLoading={isLoading}
                          placeholder="Entidad"
                          data={entities.map((entity) => ({
                            value: entity.id.toString(),
                            label: entity.name,
                          }))}
                          field={field}
                          fieldName={`transactions.${index}.fromEntityId`}
                        />
                        {watchTransactions[index]?.fromEntityId && (
                          <EntityCard
                            className="w-[150px]"
                            entity={entities.find(
                              (obj) =>
                                obj.id.toString() ===
                                watchTransactions[index]?.fromEntityId,
                            )}
                          />
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="flex flex-col items-center space-y-2">
                  <FormField
                    control={control}
                    name={`transactions.${index}.direction`}
                    render={({ field }) => (
                      <FormItem className="mx-auto flex flex-row items-center rounded-lg">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-readonly
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {watchTransactions[index]?.direction ? (
                    <Icons.arrowRight className="h-12" />
                  ) : (
                    <Icons.arrowLeft className="h-12" />
                  )}
                </div>

                <div className="flex flex-row items-end space-x-2">
                  <FormField
                    control={control}
                    name={`transactions.${index}.currency`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Divisa</FormLabel>
                        <CustomSelector
                          buttonClassName="w-22"
                          data={currencies}
                          field={field}
                          fieldName={`transactions.${index}.currency`}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`transactions.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <Input className="w-32" placeholder="$" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-row space-x-2">
                  <FormField
                    control={control}
                    name={`transactions.${index}.method`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método</FormLabel>
                        <CustomSelector
                          buttonClassName="w-32"
                          data={paymentMethods}
                          field={field}
                          fieldName={`transactions.${index}.method`}
                          placeholder="Elegir"
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`transactions.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <CustomSelector
                          buttonClassName="w-30"
                          data={operationTypes}
                          field={field}
                          fieldName={`transactions.${index}.type`}
                          placeholder="Elegir"
                        />
                      </FormItem>
                    )}
                  />
                </div>
                {entities && (
                  <FormField
                    control={control}
                    name={`transactions.${index}.operatorId`}
                    defaultValue={userEntityId?.toString()}
                    render={({ field }) => (
                      <FormItem className="mx-auto mt-2 flex flex-col">
                        <FormLabel>Operador</FormLabel>
                        <CustomSelector
                          data={entities.map((entity) => ({
                            value: entity.id.toString(),
                            label: entity.name,
                          }))}
                          field={field}
                          fieldName={`transactions.${index}.operatorId`}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              {entities && (
                <FormField
                  control={control}
                  name={`transactions.${index}.toEntityId`}
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Entidad</FormLabel>
                      <CustomSelector
                        isLoading={isLoading}
                        placeholder="Entidad"
                        data={entities.map((entity) => ({
                          value: entity.id.toString(),
                          label: entity.name,
                        }))}
                        field={field}
                        fieldName={`transactions.${index}.toEntityId`}
                      />
                      {watchTransactions[index]?.toEntityId && (
                        <EntityCard
                          className="w-[150px]"
                          entity={entities.find(
                            (obj) =>
                              obj.id.toString() ===
                              watchTransactions[index]?.toEntityId,
                          )}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <div className="mt-4 flex flex-row justify-center space-x-8">
              {index > 0 && (
                <Button type="button" onClick={() => remove(index)}>
                  <Icons.removePackage className="h-6 text-red" />
                </Button>
              )}
              <Button
                type="button"
                onClick={() =>
                  append({
                    fromEntityId: "",
                    toEntityId: "",
                    amount: "",
                    currency: "",
                    direction: false,
                    operatorId: userEntityId.toString(),
                    method: "",
                    type: "",
                  })
                }
              >
                <Icons.addPackage className="h-6 text-green" />
              </Button>
            </div>

            <Separator className="mb-8" />
          </>
        ))}
        <Button type="submit" className="mx-auto mt-6">
          Añadir transacciones
        </Button>
      </form>
    </Form>
  );
};

export default FlexibleTransactionsForm;
