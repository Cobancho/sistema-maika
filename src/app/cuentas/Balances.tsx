"use client";

import { type User } from "lucia";
import { useState, type FC, useEffect } from "react";
import { z } from "zod";
import useSearch from "~/hooks/useSearch";
import { isDarkEnough, lightenColor, numberFormatter } from "~/lib/functions";
import { cn } from "~/lib/utils";
import { useCuentasStore } from "~/stores/cuentasStore";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/shared";
import CustomPagination from "../components/CustomPagination";
import { Icons } from "../components/ui/Icons";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import BalancesCards from "./BalancesCards";
import { useTheme } from "next-themes";

interface BalancesProps {
  initialBalances: RouterOutputs["movements"]["getBalancesByEntities"];
  accountType: boolean;
  linkId: number | null;
  linkToken: string | null;
  selectedEntity: RouterOutputs["entities"]["getAll"][number] | undefined;
  selectedTag: string | undefined;
  tags: RouterOutputs["tags"]["getAll"];
  user: User | null;
  entities: RouterOutputs["entities"]["getAll"];
  uiColor: string | undefined;
  dayInPast: string | undefined;
  mainTags: string[];
}

const Balances: FC<BalancesProps> = ({
  initialBalances,
  selectedEntity,
  selectedTag,
  user,
  entities,
  uiColor,
  linkId,
  linkToken,
  accountType,
  dayInPast,
  mainTags,
}) => {
  const [detailedBalancesPage, setDetailedBalancesPage] = useState<number>(1);
  const pageSize = 8;

  const [accountListToAdd, setAccountListToAdd] = useState<number[]>([]);
  const [isListSelection, setIsListSelection] = useState<boolean>(false);

  const {
    selectedCurrency,
    setSelectedCurrency,
    setDestinationEntityId,
    destinationEntityId,
    isInverted,
    setIsInverted,
    setMovementsTablePage,
  } = useCuentasStore();

  useEffect(() => {
    if (selectedTag) {
      if (mainTags.includes(selectedTag)) {
        setIsInverted(false);
      } else {
        setIsInverted(true);
      }
    } else if (selectedEntity) {
      if (mainTags.includes(selectedEntity.tag.name)) {
        setIsInverted(false);
      } else {
        setIsInverted(true);
      }
    }
  }, [mainTags, selectedEntity, selectedTag, setIsInverted]);

  const { theme } = useTheme();

  const isDark = theme === "dark";

  const transformedBalancesSchema = z.object({
    entity: z.object({
      id: z.number().int(),
      name: z.string(),
      tagName: z.string(),
    }),
    data: z.array(z.object({ currency: z.string(), balance: z.number() })),
  });

  const { data: balances, isFetching } =
    api.movements.getBalancesByEntities.useQuery(
      {
        linkId,
        account: accountType,
        entityId: selectedEntity?.id,
        dayInPast,
        entityTag: selectedTag,
        linkToken,
      },
      { initialData: initialBalances, refetchOnWindowFocus: false },
    );

  const currencyOrder = ["usd", "ars", "usdt", "eur", "brl"];

  let detailedBalances: z.infer<typeof transformedBalancesSchema>[] = [];

  if (selectedEntity?.id) {
    detailedBalances = balances.reduce(
      (acc, balance) => {
        let entityEntry = acc.find(
          (entry) =>
            entry.entity.id ===
            (balance.selectedEntity?.id === selectedEntity.id
              ? balance.otherEntity.id
              : balance.selectedEntity.id),
        );

        if (!entityEntry) {
          entityEntry = {
            entity:
              balance.selectedEntity?.id === selectedEntity.id
                ? balance.otherEntity
                : balance.selectedEntity,
            data: [],
          };
          acc.push(entityEntry);
        }

        const balanceMultiplier =
          entityEntry.entity.id === balance.selectedEntity?.id ? -1 : 1;

        let dataEntry = entityEntry.data.find(
          (d) => d.currency === balance.currency,
        );

        if (!dataEntry) {
          dataEntry = {
            currency: balance.currency,
            balance: 0,
          };
          entityEntry.data.push(dataEntry);
        }

        dataEntry.balance += balance.balance * balanceMultiplier;

        return acc;
      },
      [] as z.infer<typeof transformedBalancesSchema>[],
    );
  } else if (selectedTag) {
    // Quiero que aparezcan dos asientos en el caso de el tag ser el mismo
    detailedBalances = balances
      .filter((obj) => obj.selectedEntity.tagName !== obj.otherEntity.tagName)
      .reduce(
        (acc, balance) => {
          const myPOVEntity =
            selectedTag === balance.selectedEntity.tagName
              ? balance.otherEntity
              : balance.selectedEntity;
          let entityEntry = acc.find(
            (entry) => entry.entity.id === myPOVEntity.id,
          );

          if (!entityEntry) {
            entityEntry = {
              entity: myPOVEntity,
              data: [],
            };
            acc.push(entityEntry);
          }

          const balanceMultiplier =
            entityEntry.entity.id === balance.selectedEntity?.id ? -1 : 1;

          let dataEntry = entityEntry.data.find(
            (d) => d.currency === balance.currency,
          );

          if (!dataEntry) {
            dataEntry = {
              currency: balance.currency,
              balance: 0,
            };
            entityEntry.data.push(dataEntry);
          }

          dataEntry.balance += balance.balance * balanceMultiplier;

          return acc;
        },
        [] as z.infer<typeof transformedBalancesSchema>[],
      );
  }

  const { mutateAsync: getUrlAsync, isLoading: isUrlLoading } =
    api.files.detailedBalancesFile.useMutation({
      onSuccess(newOperation) {
        const link = document.createElement("a");
        link.href = newOperation.downloadUrl;
        link.download = newOperation.filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      onError(err) {
        toast.error("Error al generar el archivo", {
          description: err.message,
        });
      },
    });

  const {
    results: filteredBalances,
    searchValue,
    setSearchValue,
  } = useSearch<(typeof detailedBalances)[0]>({
    dataSet: detailedBalances,
    keys: ["entity.name"],
    scoreThreshold: 0.55,
  });

  const {
    data: accountsLists,
    refetch: refetchAccountsLists,
    isLoading: isAccountsListsLoading,
  } = api.userPreferences.getPreference.useQuery(
    { userId: user!.id, preferenceKey: "accountsLists" },
    { enabled: !!user },
  );

  const { mutateAsync: addPreference } =
    api.userPreferences.addPreference.useMutation();

  const addIdToAccountList = (id: number) => {
    let title = "";
    if (accountListToAdd.indexOf(id) !== -1) {
      setAccountListToAdd(accountListToAdd.filter((n) => n !== id));
      title = `La entidad ${
        detailedBalances.find((b) => b.entity.id === id)?.entity.name
      } fue removida de la lista`;
    } else {
      setAccountListToAdd([...accountListToAdd, id]);
      title = `La entidad ${
        detailedBalances.find((b) => b.entity.id === id)?.entity.name
      } fue añadida a la lista`;
    }

    toast.info(title);
  };

  const addList = async () => {
    if (user) {
      const newList = {
        id: accountsLists ? accountsLists.length + 1 : 1,
        idList: accountListToAdd,
        isDefault: true,
      };
      const undefaultedList = accountsLists?.map((list) => ({
        ...list,
        isDefault: false,
      }));
      await addPreference({
        userId: user.id,
        preference: {
          key: "accountsLists",
          value: accountsLists ? [...undefaultedList!, newList] : [newList],
        },
      });

      setIsListSelection(false);

      setAccountListToAdd([]);

      setDetailedBalancesPage(1);

      await refetchAccountsLists();
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <BalancesCards
        balances={balances}
        selectedEntityId={selectedEntity?.id}
        selectedTag={selectedTag}
        accountType={accountType}
        isInverted={isInverted}
      />
      <div className="flex flex-row items-end justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tighter">Cuentas</h1>
          <div className="flex flex-row flex-wrap gap-4">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar"
              className="w-32"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex flex-row space-x-1">
                  <Icons.currentAccount className="h-4 w-4 text-black dark:text-white" />
                  {accountsLists &&
                    (accountsLists.find((list) => list.isDefault) ? (
                      <p>
                        Lista {accountsLists.find((list) => list.isDefault)?.id}
                      </p>
                    ) : (
                      <p>Listas</p>
                    ))}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                <DropdownMenuLabel>Listas</DropdownMenuLabel>
                {!isAccountsListsLoading ? (
                  <DropdownMenuGroup>
                    {accountsLists &&
                      accountsLists.map((list, index) => (
                        <DropdownMenuItem
                          key={index}
                          className="flex flex-row space-x-2"
                        >
                          <span
                            className={cn(
                              "rounded-full p-2",
                              list.isDefault
                                ? "bg-green"
                                : "bg-muted-foreground",
                            )}
                          ></span>
                          <div className="flex flex-col space-y-1">
                            <p className="font-semibold">Lista {list.id}</p>
                            <p className="text-sm">
                              {list.idList.slice(0, 3).flatMap((id, index) => {
                                const name = entities.find(
                                  (e) => e.id === id,
                                )?.name;
                                if (index + 1 === list.idList.length) {
                                  return name;
                                } else {
                                  return name + ", ";
                                }
                              })}
                            </p>
                          </div>
                          {!list.isDefault && (
                            <Button
                              className="flex flex-row space-x-1"
                              variant="outline"
                              onClick={async () => {
                                if (user) {
                                  await addPreference({
                                    userId: user.id,
                                    preference: {
                                      key: "accountsLists",
                                      value: accountsLists.map((obj) => {
                                        if (obj.id === list.id) {
                                          return { ...obj, isDefault: true };
                                        } else {
                                          return { ...obj, isDefault: false };
                                        }
                                      }),
                                    },
                                  });
                                  await refetchAccountsLists();
                                }
                              }}
                            >
                              <Icons.documentPlus className="h-4 w-4 text-green" />
                            </Button>
                          )}
                          {list.isDefault && (
                            <Button
                              className="flex flex-row space-x-1"
                              variant="outline"
                              onClick={async () => {
                                if (user) {
                                  await addPreference({
                                    userId: user.id,
                                    preference: {
                                      key: "accountsLists",
                                      value: accountsLists.map((obj) => {
                                        if (obj.id === list.id) {
                                          return { ...obj, isDefault: false };
                                        } else {
                                          return { ...obj };
                                        }
                                      }),
                                    },
                                  });
                                  await refetchAccountsLists();
                                }
                              }}
                            >
                              <Icons.documentMinus className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            className="flex flex-row space-x-1"
                            variant="outline"
                            onClick={async () => {
                              if (user) {
                                await addPreference({
                                  userId: user.id,
                                  preference: {
                                    key: "accountsLists",
                                    value: accountsLists.filter(
                                      (obj) => obj.id !== list.id,
                                    ),
                                  },
                                });
                                await refetchAccountsLists();
                              }
                            }}
                          >
                            <Icons.cross className="h-4 w-4 text-red" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuGroup>
                ) : (
                  <Icons.loadingCircle className="-ml-1 mr-3 h-5 w-5 animate-spin text-black dark:text-white" />
                )}
                {!isListSelection ? (
                  <DropdownMenuItem onClick={() => setIsListSelection(true)}>
                    <Icons.plus className="h-5 w-5 text-black dark:text-white" />
                    <p>Añadir lista</p>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Icons.loadingCircle className="-ml-1 mr-3 h-5 w-5 animate-spin text-black dark:text-white" />
                      <p className="animate-pulse">Seleccionando</p>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => addList()}>
                          <Icons.check className="mr-1 h-4 w-4 text-black dark:text-white" />
                          <span>Confirmar selección</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setIsListSelection(false)}
                        >
                          <Icons.cross className="mr-1 h-4 w-4 text-black dark:text-white" />
                          <span>Cancelar selección</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {!isUrlLoading ? (
                  <Button variant="outline">Generar</Button>
                ) : (
                  <p>Cargando...</p>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Extensión</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      const promise = getUrlAsync({
                        entityId: selectedEntity?.id,
                        entityTag: selectedTag,
                        detailedBalances: filteredBalances,
                        fileType: "pdf",
                      });

                      toast.promise(promise, {
                        loading: "Generando archivo...",
                        success(data) {
                          return `Archivo generado: ${data.filename}`;
                        },
                        error() {
                          return `Error al generar el archivo`;
                        },
                      });
                    }}
                  >
                    <Icons.pdf className="h-4" />
                    <span>PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const promise = getUrlAsync({
                        entityId: selectedEntity?.id,
                        entityTag: selectedTag,
                        detailedBalances: filteredBalances,
                        fileType: "csv",
                      });

                      toast.promise(promise, {
                        loading: "Generando archivo...",
                        success(data) {
                          return `Archivo generado: ${data.filename}`;
                        },
                      });
                    }}
                  >
                    <Icons.excel className="h-4" />
                    <span>Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CustomPagination
          page={detailedBalancesPage}
          pageSize={pageSize}
          itemName="entidades"
          totalCount={filteredBalances.length}
          changePageState={setDetailedBalancesPage}
        />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div
          style={{ borderColor: uiColor }}
          className="grid grid-cols-13 justify-items-center rounded-xl border-2 p-2"
        >
          <p className="col-span-1"></p>
          <p className="col-span-2">Entidad</p>
          {currencyOrder.map((currency) => (
            <p key={currency} className="col-span-2">
              {currency.toUpperCase()}
            </p>
          ))}
        </div>
        {filteredBalances
          .sort((a, b) => {
            const defaultList = accountsLists?.find((list) => list.isDefault);
            if (defaultList) {
              const aIndex = defaultList.idList.indexOf(a.entity.id);
              const bIndex = defaultList.idList.indexOf(b.entity.id);
              // Check if both objects have valid indices in the orderList
              if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
              }

              // If only a has a valid index, place it before b
              if (aIndex !== -1) {
                return -1;
              }

              // If only b has a valid index, place it before a
              if (bIndex !== -1) {
                return 1;
              }

              // If neither has a valid index, maintain the current order
              return 0;
            } else {
              return 0;
            }
          })
          .slice(
            pageSize * (detailedBalancesPage - 1),
            pageSize * detailedBalancesPage,
          )
          .map((item, index) => (
            <div
              key={item.entity.id}
              style={{
                backgroundColor: uiColor
                  ? index % 2 === 0
                    ? lightenColor(uiColor, isDark ? 60 : 20)
                    : lightenColor(uiColor, isDark ? 40 : 10)
                  : undefined,
              }}
              className="grid grid-cols-13 justify-items-center rounded-xl p-3 text-lg font-semibold"
            >
              {isListSelection ? (
                <Button
                  variant="outline"
                  className="col-span-1 border-transparent bg-transparent p-2 transition-all hover:bg-transparent"
                  onClick={() => addIdToAccountList(item.entity.id)}
                >
                  {accountListToAdd.indexOf(item.entity.id) === -1 ? (
                    <span className="animate-pulse rounded-full bg-yellow p-3"></span>
                  ) : (
                    <p className="animate-pulse text-3xl font-semibold text-yellow">
                      {accountListToAdd.indexOf(item.entity.id) + 1}
                    </p>
                  )}
                </Button>
              ) : accountsLists ? (
                accountsLists.find((list) => list.isDefault) ? (
                  accountsLists
                    .find((list) => list.isDefault)!
                    .idList.indexOf(item.entity.id) !== -1 ? (
                    <p className="text-3xl font-semibold text-yellow">
                      {accountsLists
                        .find((list) => list.isDefault)!
                        .idList.indexOf(item.entity.id) + 1}
                    </p>
                  ) : (
                    <p></p>
                  )
                ) : (
                  <p></p>
                )
              ) : (
                <p></p>
              )}
              <div
                onClick={() => {
                  setSelectedCurrency(undefined);
                  setDestinationEntityId(item.entity.id);
                  setMovementsTablePage(1);
                }}
                className={cn(
                  "col-span-2 flex items-center justify-center rounded-full p-2 transition-all hover:scale-105 hover:cursor-default hover:bg-primary hover:text-white hover:shadow-md",
                  !selectedCurrency &&
                    destinationEntityId === item.entity.id &&
                    "bg-primary text-white shadow-md",
                )}
              >
                <p>{item.entity.name}</p>
              </div>
              {currencyOrder.map((currency) => {
                const matchingBalance = item.data.find(
                  (balance) => balance.currency === currency,
                );

                return matchingBalance ? (
                  <div
                    onClick={() => {
                      if (
                        selectedCurrency !== currency ||
                        destinationEntityId !== item.entity.id
                      ) {
                        setSelectedCurrency(currency);
                        setDestinationEntityId(item.entity.id);
                        setMovementsTablePage(1);
                      } else {
                        setSelectedCurrency(undefined);
                        setDestinationEntityId(undefined);
                        setMovementsTablePage(1);
                      }
                    }}
                    key={currency}
                    style={{
                      backgroundColor:
                        selectedCurrency === currency &&
                        destinationEntityId === item.entity.id
                          ? uiColor
                          : undefined,
                    }}
                    className={cn(
                      "col-span-2 flex items-center justify-center rounded-full p-2 transition-all hover:scale-105 hover:cursor-default hover:bg-primary hover:text-white hover:shadow-md",
                      selectedCurrency === currency &&
                        destinationEntityId === item.entity.id &&
                        uiColor &&
                        isDarkEnough(uiColor) &&
                        "bg-primary text-white shadow-md",
                      selectedCurrency === currency &&
                        destinationEntityId === item.entity.id &&
                        "bg-primary text-white shadow-md",
                    )}
                  >
                    {!isFetching ? (
                      <p>
                        {numberFormatter(
                          !isInverted
                            ? matchingBalance.balance
                            : -matchingBalance.balance,
                        )}
                      </p>
                    ) : (
                      <p>Cargando...</p>
                    )}
                  </div>
                ) : (
                  <p className="col-span-2" key={currency}></p>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Balances;
